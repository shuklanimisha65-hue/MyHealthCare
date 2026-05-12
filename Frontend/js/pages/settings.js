import '/css/app.css'
import Alpine from 'alpinejs'
import { Auth } from '/js/auth.js'
import { api } from '/js/api.js'

Alpine.data('settingsApp', () => ({
  isDark: true,
  showChangePassword: false,
  pwForm: { oldPassword: '', newPassword: '', confirm: '' },
  pwError: '',
  pwSuccess: '',
  pwLoading: false,

  init() {
    if (!Auth.requireAuth()) return
    this.isDark = (localStorage.getItem('theme') ?? 'dark') === 'dark'
  },

  toggleTheme() {
    this.isDark = !this.isDark
    localStorage.setItem('theme', this.isDark ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', this.isDark)
  },

  async changePassword() {
    this.pwError = ''
    this.pwSuccess = ''
    const { oldPassword, newPassword, confirm } = this.pwForm
    if (!oldPassword || !newPassword || !confirm) { this.pwError = 'All fields are required.'; return }
    if (newPassword.length < 8) { this.pwError = 'New password must be at least 8 characters.'; return }
    if (newPassword !== confirm) { this.pwError = 'New passwords do not match.'; return }
    this.pwLoading = true
    try {
      await api.put('/api/v1/users/password', { oldPassword, newPassword })
      this.pwSuccess = 'Password changed successfully.'
      this.pwForm = { oldPassword: '', newPassword: '', confirm: '' }
    } catch (err) {
      this.pwError = err.message || 'Failed to change password.'
    } finally {
      this.pwLoading = false
    }
  },

  logout() { Auth.logout() },
}))

Alpine.start()
