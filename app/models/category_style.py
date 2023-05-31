from .measuring_category import MeasuringCategory
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from colorfield.fields import ColorField



class CategoryStyle(models.Model):
    measuring_category = models.ForeignKey(MeasuringCategory, on_delete=models.PROTECT, help_text=_(
        "Geometry related to this Category"), verbose_name=_("Measuring Category"))
    created_at = models.DateTimeField(default=timezone.now, help_text=_(
        "Creation date"), verbose_name=_("Created at"))
    fill = ColorField(default='#2c3e50', help_text=_(
        "Fill color for the polygon"), verbose_name=_("Fill Color"))
    fill_opacity = models.DecimalField(decimal_places=1 , default=0.5 )
    stroke = ColorField(default='#ffffff', help_text=_(
        "Stroke coloe for the polygon"), verbose_name=_("Stroke Color"))
    stroke_width = models.PositiveBigIntegerField(default=1 )
    xml  = models.TextField(null=True, blank=True)
    
    
    def __str__(self):
        return self.measuring_category.project.name + " - " + self.measuring_category.name

    class Meta:
        verbose_name = _("CategoryStyle")
        verbose_name_plural = _("CategoryStyles")