import '/css/app.css'
import Alpine from 'alpinejs'
import { Auth } from '/js/auth.js'
import { api } from '/js/api.js'

Alpine.data('loginApp', () => ({
  email: '',
  password: '',
  showPassword: false,
  error: '',
  loading: false,

  init() {
    if (Auth.getToken()) window.location.href = '/dashboard.html'
  },

  async handleLogin() {
    if (!this.email || !this.password) { this.error = 'Please enter email and password.'; return }
    this.error = ''
    this.loading = true
    try {
      const data = await api.post('/api/v1/users/login', {
        emailOrUsername: this.email,
        password: this.password,
      })
      Auth.login(data.data.user, data.data.accessToken)
      window.location.href = '/dashboard.html'
    } catch (err) {
      this.error = err.message || 'Login failed. Please try again.'
    } finally {
      this.loading = false
    }
  },
}))

Alpine.start()
