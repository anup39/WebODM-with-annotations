from .measuring_category import MeasuringCategory
from django.db import models
from django.contrib.gis.db.models.fields import PolygonField
from django.contrib.postgres import fields
from django.utils.translation import gettext_lazy as _
from django.utils import timezone


class CategoryGeometry(models.Model):
    measuring_category = models.ForeignKey(MeasuringCategory, on_delete=models.PROTECT, help_text=_(
        "Geometry related to this Category"), verbose_name=_("Measuring Category"))
    created_at = models.DateTimeField(default=timezone.now, help_text=_(
        "Creation date"), verbose_name=_("Created at"))
    properties = fields.JSONField(default=dict, null=True, blank=True)
    geom = PolygonField(srid=4326)

    def __str__(self):
        return self.measuring_category

    class Meta:
        verbose_name = _("CategoryGeometry")
        verbose_name_plural = _("CategoryGeometries")
