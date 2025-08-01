const express = require('express');
const router = express.Router();
const professionalsController = require('../controllers/professionals.controller');

// Get active professionals only
router.get('/active', professionalsController.getActiveProfessionals);

// Get all professionals
router.get('/', professionalsController.getProfessionals);

// Get professional by ID
router.get('/:id', professionalsController.getProfessionalById);

// Create a new professional
router.post('/', professionalsController.createProfessional);

// Update a professional
router.put('/:id', professionalsController.updateProfessional);

// Delete a professional (soft delete)
router.delete('/:id', professionalsController.deleteProfessional);

module.exports = router;
