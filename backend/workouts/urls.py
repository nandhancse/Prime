from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import WorkoutSessionViewSet, WorkoutSetCreateView, WorkoutSetDetailView


router = DefaultRouter()
router.register('', WorkoutSessionViewSet, basename='workout')

urlpatterns = [
    path('exercises/<int:exercise_id>/sets/', WorkoutSetCreateView.as_view(), name='workout-set-create'),
    path('sets/<int:pk>/', WorkoutSetDetailView.as_view(), name='workout-set-detail'),
    path('', include(router.urls)),
]
