import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import SourceEditorView from '../views/SourceEditorView.vue'
import ProjectView from '../views/ProjectView.vue'
import SliceBrowserView from '../views/SliceBrowserView.vue'
import GroupedSlicesView from '../views/GroupedSlicesView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/source/:id',
      name: 'source-editor',
      component: SourceEditorView,
      props: true
    },
    {
      path: '/project/:id',
      name: 'project',
      component: ProjectView,
      props: true
    },
    {
      path: '/slices',
      name: 'slice-browser',
      component: SliceBrowserView
    },
    {
      path: '/grouped-slices',
      name: 'grouped-slices',
      component: GroupedSlicesView
    }
  ]
})

export default router
