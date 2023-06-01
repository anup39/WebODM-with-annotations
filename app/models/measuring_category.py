from .project import Project
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from django.db.models import signals
from django.dispatch import receiver
from django.db import connection
import requests
from worker.tasks import create_geoserver_workspace ,create_geoserver_layer
from requests.auth import HTTPBasicAuth
from worker.celery import app
from celery.utils.log import get_task_logger
from colorfield.fields import ColorField

logger = get_task_logger("app.logger")

geoserver_url = 'http://137.135.165.161:8600/geoserver'
username = 'admin'
password = 'geoserver'



def create_geoserver_workspace_(workspace_name):
    workspace_url = f"{geoserver_url}/rest/workspaces"
    data = f'<workspace><name>{workspace_name}</name></workspace>'
    headers = {'Content-Type': 'text/xml'}
    auth = HTTPBasicAuth(username, password)

    response = requests.post(workspace_url, data=data,
                             headers=headers, auth=auth)

    if response.status_code == 201:
        print(f"Workspace '{workspace_name}' created successfully!")
    else:
        print(
            f"Failed to create workspace '{workspace_name}'. Error: {response.text}")


def check_workspace_exists(workspace_name):
    # Set the workspace URL
    workspace_url = f"{geoserver_url}/rest/workspaces/{workspace_name}.xml"

    # Send a GET request to check if the workspace exists
    response = requests.get(workspace_url, auth=HTTPBasicAuth(username, password))

    if response.status_code == 200:
        print(f"Workspace '{workspace_name}' exists!")
        return True
    elif response.status_code == 404:
        print(f"Workspace '{workspace_name}' does not exist.")
        return False
    else:
        print(f"Failed to check workspace '{workspace_name}'. Error: {response.text}")
        return False


def publish_table_to_geoserver(workspace_name, table_name ,create_and_publish_style, fill,fill_opacity,  stroke, stroke_width ):
    print(workspace_name, table_name , "table name","workspace name")
 
    # Set the table URL with the correct data store name
    table_url = f"{geoserver_url}/rest/workspaces/{workspace_name}/datastores/database/featuretypes"

    # Create the XML payload to publish the table
    data = f'<featureType><name>{table_name}</name></featureType>'

    headers = {'Content-Type': 'text/xml'}
    auth = HTTPBasicAuth(username, password)

    # Send the request to publish the table
    response = requests.post(table_url, data=data, headers=headers, auth=auth)


    if response.status_code == 201:
        print(f"Table '{table_name}' published successfully!")
        create_and_publish_style(workspace_name, table_name, fill ,  fill_opacity, stroke, stroke_width )


    else:
        print(f"Failed to publish table '{table_name}'. Error: {response.text}")


def create_and_publish_style(workspace_name, table_name, fill, fill_opacity, stroke, stroke_width):
    style_url = f"{geoserver_url}/rest/workspaces/{workspace_name}/styles"
    style_name = table_name
    data = f'<style><name>{style_name}</name><filename>{style_name}.sld</filename></style>'
    headers = {'Content-Type': 'text/xml'}
    auth = HTTPBasicAuth(username, password)
    response = requests.post(style_url, data=data, headers=headers, auth=auth)

    sld_xml = f"""<StyledLayerDescriptor version="1.0.0"
        xsi:schemaLocation="http://www.opengis.net/sld StyledLayerDescriptor.xsd"
        xmlns="http://www.opengis.net/sld"
        xmlns:ogc="http://www.opengis.net/ogc"
        xmlns:xlink="http://www.w3.org/1999/xlink"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
        <!-- a named layer is the basic building block of an sld document -->
        <NamedLayer>
            <Name>{style_name}</Name>
            <UserStyle>
                <!-- they have names, titles and abstracts -->
                <Title>Grey Polygon</Title>
                <Abstract>A sample style that just prints out a grey interior with a black outline</Abstract>
                <!-- FeatureTypeStyles describe how to render different features -->
                <!-- a feature type for polygons -->
                <FeatureTypeStyle>
                    <!--FeatureTypeName>Feature</FeatureTypeName-->
                    <Rule>
                        <Name>Rule 1</Name>
                        <Title>Grey Fill and Black Outline</Title>
                        <Abstract>Grey fill with a black outline 1 pixel in width</Abstract>
                        <!-- like a linesymbolizer but with a fill too -->
                        <PolygonSymbolizer>
                            <Fill>
                                <CssParameter name="fill">{fill}</CssParameter>
                                <CssParameter name="fill-opacity">{fill_opacity}</CssParameter>
                            </Fill>
                            <Stroke>
                                <CssParameter name="stroke">{stroke}</CssParameter>
                                <CssParameter name="stroke-width">{stroke_width}</CssParameter>
                            </Stroke>
                        </PolygonSymbolizer>
                    </Rule>
                </FeatureTypeStyle>
            </UserStyle>
        </NamedLayer>
    </StyledLayerDescriptor>"""

    if response.status_code == 201:
        print(f"Style '{style_name}' created successfully!")

        # Upload the SLD content for the style
        sld_url = f"{geoserver_url}/rest/workspaces/{workspace_name}/styles/{style_name}"
        headers = {'Content-Type': 'application/vnd.ogc.sld+xml'}
        response = requests.put(sld_url, data=sld_xml, headers=headers, auth=auth)

        # if response.status_code == 200:
        #     logger.info("Now assgining style")
        #     print(f"SLD content uploaded for style '{style_name}'!")
        #     # logger.info(sld_xml,'sld xml')

        #     # # Update the layer with the newly created style
        #     layer_url = f"{geoserver_url}/rest/workspaces/{workspace_name}/layers/{table_name}"
            

        #     layer_data = f'<layer> <defaultStyle><name>{style_name}</name></defaultStyle></layer>'
        #     # logger.info(layer_data,'layer data')

        #     layer_response = requests.put(layer_url, data=layer_data, headers=headers, auth=auth)
        #     logger.info("Now assgining style complete")

        #     if layer_response.status_code == 200:
        #         print(f"Layer '{table_name}' updated with the style '{style_name}'!")
        #     else:
        #         print(f"Failed to update layer '{table_name}' with the style '{style_name}'. Error: {layer_response.text}")
        # else:
            # print(f"Failed to upload SLD content for style '{style_name}'. Error: {response.text}")
    else:
        print(f"Failed to create style '{style_name}'. Error: {response.text}")



                
class MeasuringCategory(models.Model):
    name = models.CharField(max_length=255, help_text=_(
        "In which category you want to seperate your project layer"), verbose_name=_("Name"))
    project = models.ForeignKey(Project, on_delete=models.PROTECT, help_text=_(
        "Category related to the project"), verbose_name=_("Project"))
    description = models.TextField(default="", blank=True, help_text=_(
        "Description about this category"), verbose_name=_("Description"))
    created_at = models.DateTimeField(default=timezone.now, help_text=_(
        "Creation date"), verbose_name=_("Created at"))
    publised = models.BooleanField(default=False)
    view_name = models.CharField(max_length=255, blank=True, null=True, unique=True)
    

    def __str__(self):
        return self.project.name + " - " + self.name

    class Meta:
        verbose_name = _("MeasuringCategory")
        verbose_name_plural = _("MeasuringCategories")



class CategoryStyle(models.Model):
    measuring_category = models.OneToOneField(MeasuringCategory, on_delete=models.PROTECT, help_text=_(
        "Geometry related to this Category"), verbose_name=_("Measuring Category"))
    created_at = models.DateTimeField(default=timezone.now, help_text=_(
        "Creation date"), verbose_name=_("Created at"))
    fill = ColorField(default='#2c3e50', help_text=_(
        "Fill color for the polygon"), verbose_name=_("Fill Color"))
    fill_opacity = models.DecimalField(decimal_places=2, max_digits=3, default=0.5)
    stroke = ColorField(default='#ffffff', help_text=_(
        "Stroke coloe for the polygon"), verbose_name=_("Stroke Color"))
    stroke_width = models.PositiveIntegerField(default=1 )
    xml  = models.TextField(null=True, blank=True)
    
    
    def __str__(self):
        return self.measuring_category.project.name + " - " + self.measuring_category.name

    class Meta:
        verbose_name = _("CategoryStyle")
        verbose_name_plural = _("CategoryStyles")


# Added by me Anup
@receiver(signals.post_save, sender=Project, dispatch_uid="project_post_save_creating_layer")
def project_post_save_for_creating_layer(sender, instance, created, **kwargs):
    """
    It will create a view
    """
    if created:
        print("*******************Signals started Project *************")
        with connection.cursor() as cursor:
            # Convert project name to view name
            view_name = instance.name.replace(" ", "_").lower()
            cursor.execute(
                f"CREATE OR REPLACE VIEW {view_name} AS SELECT mc.*, cg.geom , cg.properties ,cg.measuring_category_id FROM public.app_measuringcategory mc JOIN public.app_categorygeometry cg ON mc.id = cg.measuring_category_id WHERE mc.project_id = %s", [instance.id])
            print("****************Congratulations the view is created***************")
            print(instance.owner.username, "workspace name")
            exists = check_workspace_exists(instance.owner.username)
            print(exists, "exists")
            if not exists:
               create_geoserver_workspace(instance.owner.username , create_geoserver_workspace_)
            create_geoserver_layer(instance.owner.username, view_name , publish_table_to_geoserver)



# Added by me Anup
@receiver(signals.post_save, sender=Project, dispatch_uid="project_post_save_measuring_category")
def project_post_save_project_for_mc(sender, instance, created, **kwargs):
    """
    It will create two category by default Grass and Garden
    """
    if created:
        MeasuringCategory.objects.create(
            name="Grass", project=instance, description="Measures grass")
        MeasuringCategory.objects.create(
            name="Garden", project=instance, description="Measure Garden")


# Added by me Anup
@receiver(signals.post_save, sender=MeasuringCategory, dispatch_uid="measuring_category_post_save_creating_layer")
def measuring_category_post_save_for_creating_layer(sender, instance, created, **kwargs):
    """
    It will create a view
    """
    if created:
        print("*******************Signals started  MC *************")
        with connection.cursor() as cursor:
            # Convert project name to view name
            view_name = instance.project.name.replace(
                " ", "_").lower() + "_" + instance.name.replace(" ", "_").lower()
            cursor.execute(
                f"CREATE OR REPLACE VIEW {view_name} AS SELECT mc.*, cg.geom , cg.properties ,cg.measuring_category_id FROM public.app_measuringcategory mc JOIN public.app_categorygeometry cg ON mc.id = cg.measuring_category_id WHERE cg.measuring_category_id = %s", [instance.id])
            print("****************Congratulations the view is created***************")
            instance.view_name = view_name
            category = MeasuringCategory.objects.get(id=instance.id)
            category.view_name = view_name
            category.save()

            category_style = CategoryStyle.objects.create(measuring_category=category)
            category_style.save()


# Added by me Anup
@receiver(signals.post_save, sender=CategoryStyle, dispatch_uid="category_style_post_save_assigning_style")
def measuring_category_post_save_for_creating_layer(sender, instance, created, **kwargs):
    """
    It will create a view
    """
    print(f"{instance} Category Style is saved")


@app.task
def publish_views_to_geoserver():
    logger.info(f"****************Started Publishing************") 

    categories = MeasuringCategory.objects.filter(publised=False)

    for category in categories:
        workspace_name = category.project.owner.username
        table_name = category.view_name

        # Call the publish_table_to_geoserver function
        category_style = CategoryStyle.objects.get(measuring_category = category.id)
        publish_table_to_geoserver(workspace_name=workspace_name, table_name=table_name , create_and_publish_style= create_and_publish_style, fill=category_style.fill , fill_opacity= category_style.fill_opacity, stroke= category_style.stroke, stroke_width= category_style.stroke_width)

        # create_and_publish_style(workspace_name=workspace_name, table_name=table_name, fill=category_style.fill , fill_opacity= category_style.fill_opacity, stroke= category_style.stroke, stroke_width= category_style.stroke_width )

        logger.info(f"****************{table_name}************Published with style ") 

        category.publised = True
        category.save()