import '/css/app.css'
import Alpine from 'alpinejs'
import { Auth } from '/js/auth.js'
import { consultApi } from '/js/api.js'

Alpine.data('consultApp', () => ({
  user: null,
  consultations: [],
  activeConsultation: null,
  messages: [],
  input: '',
  imageFile: null,
  loading: false,
  streaming: false,
  showDropdown: false,
  showConvoMenu: false,
  showNewChat: false,
  symptoms: '',
  symptomsDescription: '',
  createError: '',
  chatError: '',

  get initials() {
    if (!this.user?.fullName) return 'U'
    return this.user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  },

  async init() {
    if (!Auth.requireAuth()) return
    this.user = Auth.getUser()
    try {
      this.loading = true
      const data = await consultApi.getRecent()
      this.consultations = data?.data?.consultations || []
    } catch (err) {
      console.error('Failed to fetch consultations:', err)
    } finally {
      this.loading = false
    }
  },

  async selectConsultation(id) {
    try {
      this.loading = true
      const data = await consultApi.getById(id)
      this.activeConsultation = data?.data?.consultation
      this.messages = this.activeConsultation?.chatHistory || []
      this.$nextTick(() => this.scrollToBottom())
    } catch (err) {
      console.error('Failed to load consultation:', err)
    } finally {
      this.loading = false
    }
  },

  async createConsultation(sym, desc) {
    if (!sym?.trim()) return false
    this.createError = ''
    this.loading = true
    try {
      const data = await consultApi.create(sym, desc, this.imageFile)
      const consultation = data?.data?.consultation
      if (!consultation) {
        this.createError = data?.message || 'Failed to start consultation.'
        return false
      }
      this.activeConsultation = consultation
      this.messages = [{ role: 'user', message: sym }, ...(consultation.chatHistory || [])]
      this.consultations = [consultation, ...this.consultations]
      this.showNewChat = false
      this.symptoms = ''
      this.symptomsDescription = ''
      this.imageFile = null
      this.$nextTick(() => this.scrollToBottom())
      return true
    } catch (err) {
      this.createError = err.message || 'Something went wrong.'
      return false
    } finally {
      this.loading = false
    }
  },

  async archiveConsultation() {
    if (!this.activeConsultation?._id) return
    this.showConvoMenu = false
    try {
      await consultApi.archive(this.activeConsultation._id)
      this.consultations = this.consultations.filter(c => c._id !== this.activeConsultation._id)
      this.activeConsultation = null
      this.messages = []
    } catch (err) {
      console.error('Failed to archive:', err)
    }
  },

  async sendMessage() {
    if (!this.input.trim() || this.streaming || this.loading) return
    this.chatError = ''

    if (!this.activeConsultation) {
      const sym = this.input.trim()
      this.input = ''
      this.messages = [{ role: 'user', message: sym }]
      this.activeConsultation = { _id: null, symptoms: [sym], chatHistory: [] }
      const ok = await this.createConsultation(sym, '')
      if (!ok) {
        this.activeConsultation = null
        this.messages = []
        this.chatError = this.createError || 'Failed to start consultation. Please try again.'
      }
      return
    }

    const msg = this.input.trim()
    this.input = ''
    this.messages = [...this.messages, { role: 'user', message: msg }]
    this.streaming = true
    this.$nextTick(() => this.scrollToBottom())

    try {
      const data = await consultApi.sendMessage(this.activeConsultation._id, msg)
      const aiText = data?.data?.message
      if (aiText) {
        this.messages = [...this.messages, { role: 'ai', message: aiText }]
      } else {
        this.chatError = data?.message || 'No response from AI.'
      }
    } catch (err) {
      this.chatError = err.message || 'Failed to send message.'
    } finally {
      this.streaming = false
      this.$nextTick(() => this.scrollToBottom())
    }
  },

  handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      this.sendMessage()
    }
  },

  scrollToBottom() {
    this.$refs.messagesEnd?.scrollIntoView({ behavior: 'smooth' })
  },

  logout() { Auth.logout() },
}))

Alpine.start()
