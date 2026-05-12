import '/css/app.css'
import Alpine from 'alpinejs'
import { api } from '/js/api.js'

Alpine.data('registerApp', () => ({
  form: {
    username: '',
    fullName: '',
    email: '',
    password: '',
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    deviceType: '',
  },
  showPassword: false,
  error: '',
  loading: false,

  async handleRegister() {
    this.error = ''
    this.loading = true
    try {
      await api.post('/api/v1/users/register', this.form)
      window.location.href = '/login.html'
    } catch (err) {
      this.error = err.message || 'Registration failed. Please try again.'
    } finally {
      this.loading = false
    }
  },
}))

Alpine.start()
