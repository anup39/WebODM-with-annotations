from rest_framework import serializers, viewsets
from django_filters.rest_framework import DjangoFilterBackend
from app import models
import django_filters
from rest_framework import filters


class StandardCategoryFilter(django_filters.FilterSet):
    project = django_filters.CharFilter(field_name='project__id')

    class Meta:
        model = models.measuring_category.StandardCategory
        fields = ['project']



class StandardCategorySerializer(serializers.ModelSerializer):

    class Meta:
        model = models.measuring_category.StandardCategory
        fields = "__all__"


class StandardCategoryViewSet(viewsets.ModelViewSet):

    queryset = models.measuring_category.StandardCategory.objects.all()
    serializer_class = StandardCategorySerializer 
    filter_backends = [DjangoFilterBackend,
                       filters.SearchFilter, filters.OrderingFilter]
    filter_class = StandardCategoryFilter



class SubCategoryFilter(django_filters.FilterSet):
    project = django_filters.CharFilter(field_name='project__id')
    standard_category = django_filters.CharFilter(field_name='standard_category__id')

    class Meta:
        model = models.measuring_category.SubCategory
        fields = ['project','standard_category']


class SubCategorySerializer(serializers.ModelSerializer):

    class Meta:
        model = models.measuring_category.SubCategory
        fields = "__all__"


class SubCategoryViewSet(viewsets.ModelViewSet):

    queryset = models.measuring_category.SubCategory.objects.all()
    serializer_class = SubCategorySerializer 
    filter_backends = [DjangoFilterBackend,
                       filters.SearchFilter, filters.OrderingFilter]
    filter_class = SubCategoryFilter

class MeasuringCategoryFilter(django_filters.FilterSet):
    project = django_filters.CharFilter(field_name='project__id')
    sub_category = django_filters.CharFilter(field_name='sub_category__id')

    class Meta:
        model = models.MeasuringCategory
        fields = ['project','sub_category']


class MeasuringCategorySerializer(serializers.ModelSerializer):

    class Meta:
        model = models.MeasuringCategory
        fields = "__all__"


class MeasuringCategoryViewSet(viewsets.ModelViewSet):

    queryset = models.MeasuringCategory.objects.all()
    serializer_class = MeasuringCategorySerializer
    filter_backends = [DjangoFilterBackend,
                       filters.SearchFilter, filters.OrderingFilter]
    filter_class = MeasuringCategoryFilter


class CategoryStyleFilter(django_filters.FilterSet):
    project = django_filters.CharFilter(field_name='project_id')
    class Meta:
        model = models.measuring_category.CategoryStyle
        fields = ['project_id']


class CategoryStyleSerializer(serializers.ModelSerializer):

    class Meta:
        model = models.measuring_category.CategoryStyle
        fields = "__all__"


class CategoryStyleViewSet(viewsets.ModelViewSet):

    queryset = models.measuring_category.CategoryStyle.objects.all()
    serializer_class = CategoryStyleSerializer
    filter_backends = [DjangoFilterBackend,
                       filters.SearchFilter, filters.OrderingFilter]
    filter_class = CategoryStyleFilter



