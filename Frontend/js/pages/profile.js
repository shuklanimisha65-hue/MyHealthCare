import '/css/app.css'
import Alpine from 'alpinejs'
import { Auth } from '/js/auth.js'

Alpine.data('profileApp', () => ({
  user: null,

  get initials() {
    if (!this.user?.fullName) return 'U'
    return this.user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  },

  get fields() {
    const u = this.user
    if (!u) return []
    return [
      { label: 'Full Name',    value: u.fullName },
      { label: 'Username',     value: u.username ? `@${u.username}` : '—' },
      { label: 'Email',        value: u.email },
      { label: 'Gender',       value: u.gender     ? u.gender.charAt(0).toUpperCase()     + u.gender.slice(1)     : '—' },
      { label: 'Date of Birth',value: u.dateOfBirth ? new Date(u.dateOfBirth).toLocaleDateString() : '—' },
      { label: 'Age',          value: u.age         ? `${u.age} years` : '—' },
      { label: 'Phone',        value: u.phone || '—' },
      { label: 'Blood Group',  value: u.bloodGroup || '—' },
      { label: 'Role',         value: u.role        ? u.role.charAt(0).toUpperCase()        + u.role.slice(1)        : '—' },
    ]
  },

  init() {
    if (!Auth.requireAuth()) return
    this.user = Auth.getUser()
  },

  logout() { Auth.logout() },
}))

Alpine.start()
