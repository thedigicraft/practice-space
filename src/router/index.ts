import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import SourceEditorView from '../views/SourceEditorView.vue'
import CollectionView from '../views/CollectionView.vue'
import SliceBrowserView from '../views/SliceBrowserView.vue'
import GroupedSlicesView from '../views/GroupedSlicesView.vue'
import LibraryView from '../views/LibraryView.vue'
import SourcesView from '../views/SourcesView.vue'
import CollectionsView from '../views/CollectionsView.vue'
import SettingsView from '../views/SettingsView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/library',
      name: 'library',
      component: LibraryView
    },
    {
      path: '/sources',
      name: 'sources',
      component: SourcesView
    },
    {
      path: '/collections',
      name: 'collections',
      component: CollectionsView
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView
    },
    {
      path: '/source/:id',
      name: 'source-editor',
      component: SourceEditorView,
      props: true
    },
    {
      path: '/collection/:id',
      name: 'collection',
      component: CollectionView,
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
