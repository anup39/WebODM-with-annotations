from rest_framework import serializers, viewsets
from app import models


class MeasuringCategorySerializer(serializers.ModelSerializer):

    class Meta:
        model = models.MeasuringCategory
        fields = "__all__"


class MeasuringCategoryViewSet(viewsets.ModelViewSet):

    queryset = models.MeasuringCategory.objects.all()
    serializer_class = MeasuringCategorySerializer
