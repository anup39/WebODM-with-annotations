from .project import Project
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from django.db.models import signals
from django.db.models.signals import m2m_changed
from django.dispatch import receiver
from django.db import connection
import requests
from worker.tasks import create_geoserver_workspace ,create_geoserver_layer
from requests.auth import HTTPBasicAuth
from worker.celery import app
from celery.utils.log import get_task_logger
from colorfield.fields import ColorField
import xml.etree.ElementTree as ET


logger = get_task_logger("app.logger")

geoserver_url = 'http://137.135.165.161:8600/geoserver'
username = 'admin'
password = 'geoserver'
store = 'database'




def modify_xml_for_project(sld_xml, measuring_category_id=3, fill_color = "#FF0000",fill_opacity = "0.5",stroke_color = "#000000",stroke_width = "2"):
    # Parse the SLD XML
    tree = ET.ElementTree(ET.fromstring(sld_xml))
    root = tree.getroot()

    # Find the FeatureTypeStyle element
    feature_type_style = root.find(".//{http://www.opengis.net/sld}FeatureTypeStyle")

    # Check if the measuring category is already included in the filter
    filter_element = feature_type_style.find(".//{http://www.opengis.net/ogc}Filter")
    if filter_element is not None:
        property_is_not_equal = filter_element.find(".//{http://www.opengis.net/ogc}PropertyIsNotEqualTo")
        if property_is_not_equal is not None:
            property_name = property_is_not_equal.find(".//{http://www.opengis.net/ogc}PropertyName")
            property_value = property_is_not_equal.find(".//{http://www.opengis.net/ogc}Literal")
            if (
                property_name is not None
                and property_name.text == "measuring_category_id"
                and property_value is not None
                and property_value.text == str(measuring_category_id)
            ):
                # Measuring category already included in the filter, no action needed
                pass
            else:
                # Measuring category not included in the filter, add it using OR operator
                or_element = ET.Element("{http://www.opengis.net/ogc}Or")
                property_is_not_equal_new = ET.SubElement(or_element, "{http://www.opengis.net/ogc}PropertyIsNotEqualTo")
                property_name_new = ET.SubElement(property_is_not_equal_new, "{http://www.opengis.net/ogc}PropertyName")
                property_name_new.text = "measuring_category_id"
                property_value_new = ET.SubElement(property_is_not_equal_new, "{http://www.opengis.net/ogc}Literal")
                property_value_new.text = str(measuring_category_id)
                filter_element.append(or_element)
        else:
            # No PropertyIsNotEqualTo element found, add it
            property_is_not_equal = ET.SubElement(filter_element, "{http://www.opengis.net/ogc}PropertyIsNotEqualTo")
            property_name = ET.SubElement(property_is_not_equal, "{http://www.opengis.net/ogc}PropertyName")
            property_name.text = "measuring_category_id"
            property_value = ET.SubElement(property_is_not_equal, "{http://www.opengis.net/ogc}Literal")
            property_value.text = str(measuring_category_id)
    else:
        # No Filter element found, add it with the PropertyIsNotEqualTo element
        filter_element = ET.SubElement(feature_type_style, "{http://www.opengis.net/ogc}Filter")
        property_is_not_equal = ET.SubElement(filter_element, "{http://www.opengis.net/ogc}PropertyIsNotEqualTo")
        property_name = ET.SubElement(property_is_not_equal, "{http://www.opengis.net/ogc}PropertyName")
        property_name.text = "measuring_category_id"
        property_value = ET.SubElement(property_is_not_equal, "{http://www.opengis.net/ogc}Literal")
        property_value.text = str(measuring_category_id)

    # Add a new rule for the measuring category with the provided polygon style details
    new_rule = ET.SubElement(feature_type_style, "{http://www.opengis.net/sld}Rule")

    # Add the filter for the measuring category
    filter_element = ET.SubElement(new_rule, "{http://www.opengis.net/ogc}Filter")
    property_is_equal = ET.SubElement(filter_element, "{http://www.opengis.net/ogc}PropertyIsEqualTo")
    property_name = ET.SubElement(property_is_equal, "{http://www.opengis.net/ogc}PropertyName")
    property_name.text = "measuring_category_id"
    property_value = ET.SubElement(property_is_equal, "{http://www.opengis.net/ogc}Literal")
    property_value.text = str(measuring_category_id)

    # Add the polygon symbolizer with the provided style details
    polygon_symbolizer = ET.SubElement(new_rule, "{http://www.opengis.net/sld}PolygonSymbolizer")
    fill_element = ET.SubElement(polygon_symbolizer, "{http://www.opengis.net/sld}Fill")
    fill_color_element = ET.SubElement(fill_element, "{http://www.opengis.net/sld}CssParameter", name="fill")
    fill_color_element.text = fill_color
    fill_opacity_element = ET.SubElement(fill_element, "{http://www.opengis.net/sld}CssParameter", name="fill-opacity")
    fill_opacity_element.text = fill_opacity

    stroke_element = ET.SubElement(polygon_symbolizer, "{http://www.opengis.net/sld}Stroke")
    stroke_color_element = ET.SubElement(stroke_element, "{http://www.opengis.net/sld}CssParameter", name="stroke")
    stroke_color_element.text = stroke_color
    stroke_width_element = ET.SubElement(stroke_element, "{http://www.opengis.net/sld}CssParameter", name="stroke-width")
    stroke_width_element.text = stroke_width

    # Convert the modified XML back to a string
    modified_sld_xml = ET.tostring(root, encoding="unicode")

    print(modified_sld_xml)
    return modified_sld_xml

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


class CaseInsensitiveCharField(models.CharField):
    def get_prep_value(self, value):
        value = super().get_prep_value(value)
        if value is not None:
            value = value.lower()
        return value

class GlobalStandardCategory(models.Model):
    name = CaseInsensitiveCharField(max_length=255, help_text=_(
        "Standard Category name"), verbose_name=_("Name"), unique=True)
    description = models.TextField(default="", blank=True, help_text=_(
        "Description about this category"), verbose_name=_("Description"))
    created_at = models.DateTimeField(default=timezone.now, help_text=_(
        "Creation date"), verbose_name=_("Created at"))

    def __str__(self):
        return str(self.name)


class GlobalSubCategory(models.Model):
    name = models.CharField(max_length=255, help_text=_(
        "In which Sub category you want to seperate your project layer"), verbose_name=_("Name") )
    standard_category = models.ForeignKey(GlobalStandardCategory, on_delete=models.PROTECT, help_text=_(
        "Standard Category related to the project"), verbose_name=_("Standard Category"),blank=True, null=True )
    description = models.TextField(default="", blank=True, help_text=_(
        "Description about this category"), verbose_name=_("Description"))
    created_at = models.DateTimeField(default=timezone.now, help_text=_(
        "Creation date"), verbose_name=_("Created at"))




    def __str__(self):
        return str(self.standard_category.name)+"|"+str(self.name)


class GlobalMeasuringCategory(models.Model):
    name = models.CharField(max_length=255, help_text=_(
        "In which category you want to seperate your project layer"), verbose_name=_("Name"))
    sub_category = models.ForeignKey(GlobalSubCategory, on_delete=models.PROTECT, help_text=_(
        "Sub Category related to the project"), verbose_name=_("Sub Category"), null=True, blank=True)
    description = models.TextField(default="", blank=True, help_text=_(
        "Description about this category"), verbose_name=_("Description"))
    created_at = models.DateTimeField(default=timezone.now, help_text=_(
        "Creation date"), verbose_name=_("Created at"))

    def __str__(self):
        return self.sub_category.standard_category.name + "|" + "|" +self.sub_category.name+"|"+ self.name



class GlobalCategoryStyle(models.Model):
    category = models.OneToOneField(GlobalMeasuringCategory, on_delete=models.PROTECT, help_text=_(
        "Style related to this Category"), verbose_name=_("Category"))
    fill = ColorField(default='#2c3e50', help_text=_(
        "Fill color for the polygon"), verbose_name=_("Fill Color"))
    fill_opacity = models.DecimalField(decimal_places=2, max_digits=3, default=0.5)
    stroke = ColorField(default='#ffffff', help_text=_(
        "Stroke color for the polygon"), verbose_name=_("Stroke Color"))
    stroke_width = models.PositiveIntegerField(default=1 )
    xml  = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now, help_text=_(
        "Creation date"), verbose_name=_("Created at"))
    
    def __str__(self):
        return self.category.name

class ManageCategory(models.Model):
    project = models.OneToOneField(Project, on_delete=models.PROTECT, help_text=_(
        "Manage Category related to the project"), verbose_name=_("Project"))
    standard_category = models.ManyToManyField(GlobalStandardCategory, blank=True, null=True )
    sub_category = models.ManyToManyField(GlobalSubCategory,  blank=True, null=True )
    category = models.ManyToManyField(GlobalMeasuringCategory,  blank=True, null=True )


    def __str__(self) -> str:
        return self.project.name
    

class StandardCategory(models.Model):
    name = models.CharField(max_length=255, help_text=_(
        "In which standard category you want to seperate your project layer"), verbose_name=_("Name"),unique=False)
    project = models.ForeignKey(Project, on_delete=models.PROTECT, help_text=_(
        "Standard Category related to the project"), verbose_name=_("Project"), null=True, blank=True)
    description = models.TextField(default="", blank=True, help_text=_(
        "Description about this category"), verbose_name=_("Description"))
    created_at = models.DateTimeField(default=timezone.now, help_text=_(
        "Creation date"), verbose_name=_("Created at"))
    publised = models.BooleanField(default=False)
    view_name = models.CharField(max_length=255, blank=True, null=True, unique=True)
    is_display = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)


    def __str__(self):
        return str(self.project.name) + "|"+str(self.name)




class SubCategory(models.Model):
    name = models.CharField(max_length=255, help_text=_(
        "In which Sub category you want to seperate your project layer"), verbose_name=_("Name"))
    project = models.ForeignKey(Project, on_delete=models.PROTECT, help_text=_(
        "Sub Category related to the project"), verbose_name=_("Project") ,null=True, blank=True )
    standard_category = models.ForeignKey(StandardCategory, on_delete=models.PROTECT, help_text=_(
        "Standard Category related to the project"), verbose_name=_("Standard Category"),blank=True, null=True )
    description = models.TextField(default="", blank=True, help_text=_(
        "Description about this category"), verbose_name=_("Description"))
    created_at = models.DateTimeField(default=timezone.now, help_text=_(
        "Creation date"), verbose_name=_("Created at"))
    publised = models.BooleanField(default=False)
    view_name = models.CharField(max_length=255, blank=True, null=True, unique=True)
    is_display = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)



    def __str__(self):
        return str(self.project.name) + "|"+str(self.standard_category.name)+"|"+str(self.name)

                
class MeasuringCategory(models.Model):
    name = models.CharField(max_length=255, help_text=_(
        "In which category you want to seperate your project layer"), verbose_name=_("Name"))
    project = models.ForeignKey(Project, on_delete=models.PROTECT, help_text=_(
        "Category related to the project"), verbose_name=_("Project"), null=True, blank=True)
    standard_category = models.ForeignKey(StandardCategory, on_delete=models.PROTECT, help_text=_(
        "Standard Category related to the project"), verbose_name=_("Standard Category"), null=True, blank=True )
    sub_category = models.ForeignKey(SubCategory, on_delete=models.PROTECT, help_text=_(
        "Sub Category related to the project"), verbose_name=_("Sub Category"), null=True, blank=True)
    description = models.TextField(default="", blank=True, help_text=_(
        "Description about this category"), verbose_name=_("Description"))
    created_at = models.DateTimeField(default=timezone.now, help_text=_(
        "Creation date"), verbose_name=_("Created at"))
    publised = models.BooleanField(default=False)
    view_name = models.CharField(max_length=255, blank=True, null=True, unique=True)
    is_display = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)



    def __str__(self):
        return self.project.name + " - " + self.name

    class Meta:
        verbose_name = _("MeasuringCategory")
        verbose_name_plural = _("MeasuringCategories")



class CategoryStyle(models.Model):
    project = models.ForeignKey(Project, on_delete=models.PROTECT, help_text=_(
        "Style related to the project"), verbose_name=_("Project"), null=True, blank=True)
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
    is_edited = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    
    
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

            # Now create a Category Management for this 
            project = Project.objects.get(id=instance.id)

            ManageCategory.objects.create(project=project)



# Added by me Anup
@receiver(signals.post_save, sender=Project, dispatch_uid="project_post_save_measuring_category")
def project_post_save_project_for_mc(sender, instance, created, **kwargs):
    """
    It will create two category by default Grass and Garden
    """
    if created:
        # MeasuringCategory.objects.create(
        #     name="Grass", project=instance, description="Measures grass")
        # MeasuringCategory.objects.create(
        #     name="Garden", project=instance, description="Measure Garden")
        pass


@receiver(m2m_changed, sender=ManageCategory.standard_category.through)
def check_standard_category_changes(sender, instance, action, model, **kwargs):

    if action == "pre_add":
        print("new category added")
        prev_standard_categories = set(instance.standard_category.all().values_list('pk', flat=True))
        new_standard_categories = set(kwargs['pk_set']) - prev_standard_categories
        if new_standard_categories:
            for category_id in new_standard_categories:
                category = GlobalStandardCategory.objects.get(pk=category_id)
                if not StandardCategory.objects.filter(project=instance.project.id, name=category.name).exists():                    
                    StandardCategory.objects.create(project=instance.project, name=category.name , description=category.description ,is_display=True)

    if action == "post_remove":
        print("category is removed")
        prev_standard_categories = set(instance.standard_category.all().values_list('pk', flat=True))
        new_standard_categories = set(kwargs['pk_set']) - prev_standard_categories
        if new_standard_categories:
            for category_id in new_standard_categories:
                category = GlobalStandardCategory.objects.get(pk=category_id)
                if StandardCategory.objects.filter(project=instance.project.id, name=category.name).exists():                    
                    standard_category = StandardCategory.objects.filter(project=instance.project.id, name=category.name)
                    standard_category.is_display = False
                    standard_category.save()


    if action == "post_clear":
        print("Clear")


@receiver(m2m_changed, sender=ManageCategory.sub_category.through)
def check_sub_category_changes(sender, instance, action, model, **kwargs):

    if action == "pre_add":
        print("new category added")

        prev_sub_categories = set(instance.sub_category.all().values_list('pk', flat=True))

        # Get the newly selected sub categories
        new_sub_categories = set(kwargs['pk_set']) - prev_sub_categories

        # Print the changes for sub categories
        if new_sub_categories:
            print("Newly selected sub categories:")
            for category_id in new_sub_categories:
                category = GlobalSubCategory.objects.get(pk=category_id)
                print(category) 

    if action == "post_remove":
        print("category is removed")

        prev_sub_categories = set(instance.sub_category.all().values_list('pk', flat=True))

        # Get the newly selected sub categories
        new_sub_categories = set(kwargs['pk_set']) - prev_sub_categories

        # Print the changes for sub categories
        if new_sub_categories:
            print(" Unselected sub categories:")
            for category_id in new_sub_categories:
                category = GlobalSubCategory.objects.get(pk=category_id)
                print(category) 

    if action == "post_clear":
        print("Clear")

@receiver(m2m_changed, sender=ManageCategory.category.through)
def check_category_changes(sender, instance, action, model, **kwargs):

    if action == "pre_add":
        print("new category added")

        prev_categories = set(instance.category.all().values_list('pk', flat=True))

        # Get the newly selected  categories
        new_categories = set(kwargs['pk_set']) - prev_categories

        # Print the changes for  categories
        if new_categories:
            print("Newly selected  categories:")
            for category_id in new_categories:
                category = GlobalMeasuringCategory.objects.get(pk=category_id)
                print(category) 

    if action == "post_remove":
        print("category is removed")

        prev_categories = set(instance.category.all().values_list('pk', flat=True))

        # Get the newly selected  categories
        new_categories = set(kwargs['pk_set']) - prev_categories

        # Print the changes for  categories
        if new_categories:
            print(" Unselected  categories:")
            for category_id in new_categories:
                category = GlobalMeasuringCategory.objects.get(pk=category_id)
                print(category) 

    if action == "post_clear":
        print("Clear")



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
            view_name_project = instance.project.name.replace(" ", "_").lower() 
            view_name_standard = instance.standard_category.name.replace(" ", "_").lower() 
            view_name_sub = instance.sub_category.name.replace(" ", "_").lower() 
            view_name = view_name_project+ "_" + view_name_standard+ "_"+view_name_sub+"_" + instance.name.replace(" ", "_").lower()

            cursor.execute(
                f"CREATE OR REPLACE VIEW {view_name} AS SELECT mc.*, cg.geom , cg.properties ,cg.measuring_category_id FROM public.app_measuringcategory mc JOIN public.app_categorygeometry cg ON mc.id = cg.measuring_category_id WHERE cg.measuring_category_id = %s", [instance.id])
            print("****************Congratulations the view is created***************")
            instance.view_name = view_name
            category = MeasuringCategory.objects.get(id=instance.id)
            project = Project.objects.get(id=instance.project.id)
            category.view_name = view_name
            category.save()

            category_style = CategoryStyle.objects.create(project=project, measuring_category=category)
            category_style.save()


# # Added by me Anup
@receiver(signals.post_save, sender=CategoryStyle, dispatch_uid="category_style_post_save_assigning_style")
def measuring_category_post_save_for_assiging_style(sender, instance, created, **kwargs):
    """
    It will create a view
    """
    print(f"{instance} Category Style is saved")
    workspace = instance.measuring_category.project.owner.username
    layer_url = f"{geoserver_url}/rest/workspaces/{workspace}/layers/{instance.measuring_category.view_name}"
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

    style_url = f"{geoserver_url}/rest/workspaces/{workspace}/styles/{instance.measuring_category.view_name}.sld"
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
        style_url_project = f"{geoserver_url}/rest/workspaces/{workspace}/styles/{project_name}.sld"
        response_style_project = requests.get(style_url_project, auth=auth)

        if response_style_project.status_code == 200:
            print(f"Style exists for this project {project_name}")
            layer_url = f"{geoserver_url}/rest/workspaces/{workspace}/layers/{project_name}"
            headers = {'Content-Type': 'text/xml'}
            layer_data_project = f'<layer> <defaultStyle><name>{project_name}</name></defaultStyle></layer>'
            layer_response = requests.put(layer_url, data=layer_data_project, headers=headers, auth=auth)

            if layer_response.status_code == 200 :
                print(f"Style is assgined to Project layer {project_name}")
                response_style_project = requests.get(style_url_project, auth=auth)  
                if response_style_project.status_code == 200:
                    sld_xml = response_style_project.content.decode("utf-8")
                    # print(sld_xml,"sld xml of the project ")
                    sld_xml_modified= modify_xml_for_project(sld_xml,measuring_category_id=instance.measuring_category.id,fill_color=instance.fill, fill_opacity= str(instance.fill_opacity), stroke_color=instance.stroke, stroke_width=str(instance.stroke_width))
                    sld_url = f"{geoserver_url}/rest/workspaces/{workspace}/styles/{project_name}"
                    headers = {'Content-Type': 'application/vnd.ogc.sld+xml'}
                    response = requests.put(sld_url, data=sld_xml_modified, headers=headers, auth=auth)
                    print("sucess all ")

                else:
                    print("Failed to retrieve SLD:", response_style_project.status_code)    

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



# Sql quries to delete all the view 

# DO $$ 
# DECLARE 
#     view_name TEXT;
# BEGIN 
#     FOR view_name IN (SELECT table_name FROM information_schema.views WHERE table_schema = 'public' AND table_name NOT IN ('geography_columns', 'geometry_columns', 'raster_columns', 'raster_overviews')) LOOP
#         EXECUTE 'DROP VIEW IF EXISTS public.' || quote_ident(view_name) || ' CASCADE;';
#     END LOOP; 
# END $$;