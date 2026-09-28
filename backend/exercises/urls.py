from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import EquipmentViewSet, ExerciseViewSet, MuscleGroupViewSet


router = DefaultRouter()
router.register('muscle-groups', MuscleGroupViewSet, basename='muscle-group')
router.register('equipment', EquipmentViewSet, basename='equipment')
router.register('', ExerciseViewSet, basename='exercise')

urlpatterns = [
    path('', include(router.urls)),
]
