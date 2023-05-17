from .project import Project
from .task import Task, validate_task_options, gcp_directory_path
from .preset import Preset
from .theme import Theme
from .setting import Setting
from .plugin_datum import PluginDatum
from .plugin import Plugin
from .measuring_category import MeasuringCategory
from .category_geometry import CategoryGeometry

# deprecated


def image_directory_path(image_upload, filename):
    raise Exception("Deprecated")
