from .project import Project
from django.db import models
from django.contrib.gis.db.models.fields import GeometryField
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from django.db.models import signals
from django.dispatch import receiver
from django.db import connection
import requests
from requests.auth import HTTPBasicAuth


geoserver_url = 'http://localhost:8080/geoserver'
username = 'admin'
password = 'geoserver'


def create_workspace(workspace_name):
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
            name="Garden", project=instance, description="Measure grass")

# Added by me Anup


@receiver(signals.post_save, sender=Project, dispatch_uid="project_post_save_creating_layer")
def project_post_save_for_creating_layer(sender, instance, created, **kwargs):
    """
    It will create a view
    """
    if created:
        print("*******************Signals started *************")
        with connection.cursor() as cursor:
            # Convert project name to view name
            view_name = instance.name.replace(" ", "_").lower()
            cursor.execute(
                f"CREATE OR REPLACE VIEW {view_name} AS SELECT mc.*, cg.geom , cg.properties ,cg.measuring_category_id FROM public.app_measuringcategory mc JOIN public.app_categorygeometry cg ON mc.id = cg.measuring_category_id WHERE mc.project_id = %s", [instance.id])
            print("****************Congratulations the view is created***************")
            print(instance.owner.username, "workspace name")
            create_workspace(instance.owner.username)
            print("****************Congratulations workspace is created***************")

# Now create a workspace from the user information,
# Layer related to the project in geoserver using rest api of geoserver
