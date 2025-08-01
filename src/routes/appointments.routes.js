const express = require('express');
const router = express.Router();
const appointmentsController = require('../controllers/appointments.controller');

// Get appointments by date query parameter
router.get('/', appointmentsController.getAppointments);

// Get days that have appointments
router.get('/days-with-appointments', appointmentsController.getDaysWithAppointments);

// Get statistics for appointments
router.get('/stats', appointmentsController.getAppointmentStats);

// Get monthly revenue
router.get('/revenue/monthly', appointmentsController.getMonthlyRevenue);

// Get revenue by services
router.get('/revenue/services', appointmentsController.getServiceRevenue);

// Get appointments by specific date
router.get('/by-date/:date', appointmentsController.getAppointmentsByDate);

// Get appointments by professional
router.get('/by-professional/:professionalId', appointmentsController.getAppointmentsByProfessional);

// Get a single appointment
router.get('/:id', appointmentsController.getAppointmentById);

// Create a new appointment
router.post('/', appointmentsController.createAppointment);

// Update an appointment
router.put('/:id', appointmentsController.updateAppointment);

// Delete an appointment
router.delete('/:id', appointmentsController.deleteAppointment);

module.exports = router;
