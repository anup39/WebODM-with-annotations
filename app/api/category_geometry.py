from rest_framework import serializers, viewsets
from django_filters.rest_framework import DjangoFilterBackend
from app import models
import django_filters
from rest_framework import filters


class CategoryGeometryFilter(django_filters.FilterSet):
    measuring_category = django_filters.CharFilter(
        field_name='measuring_category__id')

    class Meta:
        model = models.CategoryGeometry
        fields = ['measuring_category']


class CategoryGeometrySerializer(serializers.ModelSerializer):

    class Meta:
        model = models.CategoryGeometry
        fields = "__all__"


class CategoryGeometryViewSet(viewsets.ModelViewSet):

    queryset = models.CategoryGeometry.objects.all()
    serializer_class = CategoryGeometrySerializer
    filter_backends = [DjangoFilterBackend,
                       filters.SearchFilter, filters.OrderingFilter]
    filter_class = CategoryGeometryFilter
