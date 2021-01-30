import { Component } from 'vue'
import { RouteRecordRaw } from 'vue-router'

const settingsRouteNamePrefix = 'settings'
export type SettingsRouteName =
  | 'settingsProfile'
  | 'settingsSession'
  | 'settingsBrowser'
  | 'settingsQall'
  | 'settingsStamp'
  | 'settingsTheme'

export const isSettingsRouteName = (
  name: string
): name is SettingsRouteName => {
  return (
    name.startsWith(settingsRouteNamePrefix) &&
    name.slice(settingsRouteNamePrefix.length) !== ''
  )
}

const pathByRouteName = (routeName: SettingsRouteName) => {
  switch (routeName) {
    case 'settingsProfile':
      return 'profile'
    case 'settingsSession':
      return 'session'
    case 'settingsBrowser':
      return 'browser'
    case 'settingsQall':
      return 'qall'
    case 'settingsStamp':
      return 'stamp'
    case 'settingsTheme':
      return 'theme'
  }
}

const Profile = () =>
  import(
    /* webpackChunkName: "SettingsProfile" */ '@/views/Settings/ProfileTab.vue'
  )
const Session = () =>
  import(
    /* webpackChunkName: "SettingsSession" */ '@/views/Settings/SessionTab.vue'
  )
const Browser = () =>
  import(
    /* webpackChunkName: "SettingsBrowser" */ '@/views/Settings/BrowserTab.vue'
  )
const Qall = () =>
  import(/* webpackChunkName: "SettingsQall" */ '@/views/Settings/QallTab.vue')
const Stamp = () =>
  import(
    /* webpackChunkName: "SettingsStamps" */ '@/views/Settings/StampTab.vue'
  )
const Theme = () =>
  import(
    /* webpackChunkName: "SettingsTheme" */ '@/views/Settings/ThemeTab.vue'
  )

const createRoute = (name: SettingsRouteName, component: Component) => ({
  name,
  path: pathByRouteName(name),
  component: component
})

export const settingsRoutes: RouteRecordRaw[] = [
  createRoute('settingsProfile', Profile),
  createRoute('settingsSession', Session),
  createRoute('settingsBrowser', Browser),
  createRoute('settingsQall', Qall),
  createRoute('settingsStamp', Stamp),
  createRoute('settingsTheme', Theme)
]

export const defaultSettingsName: SettingsRouteName = 'settingsProfile'
export const constructSettingsPath = (routeName: SettingsRouteName) =>
  `/settings/${pathByRouteName(routeName)}`
