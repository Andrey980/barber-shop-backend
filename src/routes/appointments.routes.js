const express = require('express');
const router = express.Router();
const appointmentsController = require('../controllers/appointments.controller');

// Get appointments by date query parameter
router.get('/', appointmentsController.getAppointments);

// Get days that have appointments
router.get('/days-with-appointments', appointmentsController.getDaysWithAppointments);

// Get appointments by specific date
router.get('/by-date/:date', appointmentsController.getAppointmentsByDate);

// Get a single appointment
router.get('/:id', appointmentsController.getAppointmentById);

// Create a new appointment
router.post('/', appointmentsController.createAppointment);

// Update an appointment
router.put('/:id', appointmentsController.updateAppointment);

// Delete an appointment
router.delete('/:id', appointmentsController.deleteAppointment);

module.exports = router;
