const express = require('express');
const router = express.Router();
const servicesController = require('../controllers/services.controller');

// Get all services
router.get('/', servicesController.getAllServices);

// Get a single service
router.get('/:id', servicesController.getServiceById);

// Create a new service
router.post('/', servicesController.createService);

// Update a service
router.put('/:id', servicesController.updateService);

// Delete a service
router.delete('/:id', servicesController.deleteService);

module.exports = router;
