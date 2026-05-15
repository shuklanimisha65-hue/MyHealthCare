import '/css/app.css'
import Alpine from 'alpinejs'
import { Auth } from '/js/auth.js'

Alpine.data('dashboardApp', () => ({
  user: null,
  search: '',

  quickActions: [
    { icon: '🤖', label: 'AI Consultation', path: '/consultation.html', bg: 'bg-emerald-600 hover:bg-emerald-500' },
    { icon: '👤', label: 'My Profile',      path: '/profile.html',      bg: 'bg-violet-600 hover:bg-violet-500'   },
  ],

  healthTips: [
    { icon: '💧', tip: 'Drink at least 8 glasses (2 litres) of water daily to stay hydrated.' },
    { icon: '🚶', tip: 'Aim for 10,000 steps a day (~8 km) to maintain cardiovascular health.' },
    { icon: '😴', tip: 'Get 7–9 hours of sleep each night for optimal recovery and focus.' },
    { icon: '🥗', tip: 'Eat a balanced diet rich in vegetables, proteins and whole grains.' },
  ],

  allSuggestions: [
    { label: 'Start AI Consultation', path: '/consultation.html' },
    { label: 'Update Profile',        path: '/profile.html'      },
    { label: 'Settings',              path: '/settings.html'     },
  ],

  get suggestions() {
    if (!this.search.trim()) return []
    return this.allSuggestions.filter(s =>
      s.label.toLowerCase().includes(this.search.toLowerCase())
    )
  },

  get firstName() {
    return this.user?.fullName?.split(' ')[0] || 'User'
  },

  init() {
    if (!Auth.requireAuth()) return
    this.user = Auth.getUser()
  },

  logout() { Auth.logout() },
}))

Alpine.start()

