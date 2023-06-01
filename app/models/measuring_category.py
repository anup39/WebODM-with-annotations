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
store = 'database'



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





def create_and_publish_style(workspace_name, table_name, fill, fill_opacity, stroke, stroke_width):
    style_url = f"{geoserver_url}/rest/workspaces/{workspace_name}/styles"
    style_name = table_name
    data = f'<style><name>{style_name}</name><filename>{style_name}.sld</filename></style>'
    headers = {'Content-Type': 'text/xml'}
    auth = HTTPBasicAuth(username, password)
    response = requests.post(style_url, data=data, headers=headers, auth=auth)

    sld_xml = f"""
        <StyledLayerDescriptor version="1.0.0" xsi:schemaLocation="http://www.opengis.net/sld StyledLayerDescriptor.xsd" xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
            <NamedLayer>
                <Name>{style_name}</Name>
                <UserStyle>
                <FeatureTypeStyle>
                    <Rule>
                    <ogc:Filter>
                        <ogc:PropertyIsNotEqualTo>
                        <ogc:PropertyName>measuring_category_id</ogc:PropertyName>
                        <ogc:Literal>0</ogc:Literal>
                        </ogc:PropertyIsNotEqualTo>
                    </ogc:Filter>
                    <PolygonSymbolizer>
                        <Fill>
                        <CssParameter name="fill">{fill}</CssParameter> <!-- Fill color for all other categories -->
                        <CssParameter name="fill-opacity">{fill_opacity}</CssParameter>
                        </Fill>
                        <Stroke>
                        <CssParameter name="stroke">{stroke}</CssParameter> <!-- Stroke color for all other categories -->
                        <CssParameter name="stroke-width">{stroke_width}</CssParameter>
                        </Stroke>
                    </PolygonSymbolizer>
                    </Rule>
                    <!-- Add more rules for additional categories -->
                </FeatureTypeStyle>
                </UserStyle>
            </NamedLayer>
        </StyledLayerDescriptor>
    """

    if response.status_code == 201:
        print(f"Style '{style_name}' created successfully!")

        # Upload the SLD content for the style
        sld_url = f"{geoserver_url}/rest/workspaces/{workspace_name}/styles/{style_name}"
        headers = {'Content-Type': 'application/vnd.ogc.sld+xml'}
        response = requests.put(sld_url, data=sld_xml, headers=headers, auth=auth)
    else:
        print(f"Failed to create style '{style_name}'. Error: {response.text}")




def publish_table_to_geoserver(workspace_name='super_admin', table_name=None ,create_and_publish_style=create_and_publish_style, fill='#2C3E50',fill_opacity=0.50,  stroke='#FFFFFF', stroke_width=1 ):
    print(workspace_name, table_name , "table name","workspace name")
 
    # Set the table URL with the correct data store name
    table_url = f"{geoserver_url}/rest/workspaces/{workspace_name}/datastores/{store}/featuretypes"

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


# # Added by me Anup
@receiver(signals.post_save, sender=CategoryStyle, dispatch_uid="category_style_post_save_assigning_style")
def measuring_category_post_save_for_assiging_style(sender, instance, created, **kwargs):
    """
    It will create a view
    """
    print(f"{instance} Category Style is saved")
    workpace = instance.measuring_category.project.owner.username
    layer_url = f"{geoserver_url}/rest/workspaces/{workpace}/layers/{instance.measuring_category.view_name}"
    auth = HTTPBasicAuth(username, password)
    response = requests.get(layer_url, auth=auth)
    headers = {'Content-Type': 'text/xml'}
    if response.status_code == 200:
        layer_data = f'<layer> <defaultStyle><name>{instance.measuring_category.view_name}</name></defaultStyle></layer>'
        layer_response = requests.put(layer_url, data=layer_data, headers=headers, auth=auth)
        logger.info("Now assgining style complete")
        if layer_response.status_code == 200:
            print(f"Layer '{instance.measuring_category.view_name}' updated with the style '{instance.measuring_category.view_name}'!")
        else:
            print(f"Failed to update layer '{instance.measuring_category.view_name}' with the style '{instance.measuring_category.view_name}'. Error: {layer_response.text}")

    style_url = f"{geoserver_url}/rest/workspaces/{workpace}/styles/{instance.measuring_category.view_name}.sld"
    response_style = requests.get(style_url, auth=auth)
    if response_style.status_code == 200:
        logger.info("There is the style ")
        headers = {'Content-Type': 'application/vnd.ogc.sld+xml'}
        sld_xml = f"""
                    <StyledLayerDescriptor version="1.0.0" xsi:schemaLocation="http://www.opengis.net/sld StyledLayerDescriptor.xsd" xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
                        <NamedLayer>
                            <Name>{instance.measuring_category.view_name}</Name>
                            <UserStyle>
                            <FeatureTypeStyle>
                                <Rule>
                                <ogc:Filter>
                                    <ogc:PropertyIsNotEqualTo>
                                    <ogc:PropertyName>measuring_category_id</ogc:PropertyName>
                                    <ogc:Literal>0</ogc:Literal>
                                    </ogc:PropertyIsNotEqualTo>
                                </ogc:Filter>
                                <PolygonSymbolizer>
                                    <Fill>
                                    <CssParameter name="fill">{instance.fill}</CssParameter> <!-- Fill color for all other categories -->
                                    <CssParameter name="fill-opacity">{instance.fill_opacity}</CssParameter>
                                    </Fill>
                                    <Stroke>
                                    <CssParameter name="stroke">{instance.stroke}</CssParameter> <!-- Stroke color for all other categories -->
                                    <CssParameter name="stroke-width">{instance.stroke_width}</CssParameter>
                                    </Stroke>
                                </PolygonSymbolizer>
                                </Rule>
                                <!-- Add more rules for additional categories -->
                            </FeatureTypeStyle>
                            </UserStyle>
                        </NamedLayer>
                    </StyledLayerDescriptor>   
            """


        response = requests.put(style_url, data=sld_xml, headers=headers, auth=auth)

        if response.status_code == 200:
            print("*********Style is updated now****************")
        else:
            print(f"Failed to update SLD content for style '{instance.measuring_category.view_name}'. Error: {response.text}")



        # Similar things for project also 
        project_name = instance.measuring_category.project.name.replace(" ", "_").lower() 
        style_url_project = f"{geoserver_url}/rest/workspaces/{workpace}/styles/{project_name}.sld"
        response_style_project = requests.get(style_url_project, auth=auth)

        if response_style_project.status_code == 200:
            print(f"Style exists for this project {project_name}")
            layer_url = f"{geoserver_url}/rest/workspaces/{workpace}/layers/{project_name}"
            headers = {'Content-Type': 'text/xml'}
            layer_data_project = f'<layer> <defaultStyle><name>{project_name}</name></defaultStyle></layer>'
            layer_response = requests.put(layer_url, data=layer_data_project, headers=headers, auth=auth)

            if layer_response.status_code == 200 :
                print(f"Style is assgined to Project layer {project_name}")
            else:
                print(f"Failed to assgin the style feor project {project_name}")

        
        


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