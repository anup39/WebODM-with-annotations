from rest_framework import serializers, viewsets
from app import models


class CategoryGeometrySerializer(serializers.ModelSerializer):

    class Meta:
        model = models.CategoryGeometry
        fields = "__all__"


class CategoryGeometryViewSet(viewsets.ModelViewSet):

    queryset = models.CategoryGeometry.objects.all()
    serializer_class = CategoryGeometrySerializer
