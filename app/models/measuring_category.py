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


geoserver_url = 'http://137.135.165.161:8600/geoserver'
username = 'admin'
password = 'geoserver'


#Testing again

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


def publish_table_to_geoserver(workspace_name, table_name):
 
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

    def __str__(self):
        return self.project.name + " - " + self.name

    class Meta:
        verbose_name = _("MeasuringCategory")
        verbose_name_plural = _("MeasuringCategories")


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
            create_geoserver_layer(instance.project.owner.username, view_name , publish_table_to_geoserver)


