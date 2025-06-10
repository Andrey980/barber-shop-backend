const db = require('../config/database');

const servicesController = {
    // Get all services
    getAllServices: async (req, res) => {
        try {
            const [services] = await db.query('SELECT * FROM services');
            res.json(services);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error fetching services' });
        }
    },

    // Get a single service by ID
    getServiceById: async (req, res) => {
        try {
            const [service] = await db.query('SELECT * FROM services WHERE id = ?', [req.params.id]);
            
            if (service.length === 0) {
                return res.status(404).json({ message: 'Service not found' });
            }
            
            res.json(service[0]);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error fetching service' });
        }
    },    // Create a new service
    createService: async (req, res) => {
        try {
            const { name, description, price, duration } = req.body;
            
            if (!name || !description || !price || !duration) {
                return res.status(400).json({ message: 'Please provide all required fields' });
            }

            const [result] = await db.query(
                'INSERT INTO services (name, description, price, duration) VALUES (?, ?, ?, ?)',
                [name, description, price, duration]
            );            res.status(201).json({
                id: result.insertId,
                name,
                description,
                price,
                duration
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error creating service' });
        }
    },    // Update a service
    updateService: async (req, res) => {
        try {
            const { name, description, price, duration } = req.body;
            
            if (!name && !description && !price && !duration) {
                return res.status(400).json({ message: 'Please provide at least one field to update' });
            }

            const [service] = await db.query('SELECT * FROM services WHERE id = ?', [req.params.id]);
            
            if (service.length === 0) {
                return res.status(404).json({ message: 'Service not found' });
            }

            const updatedService = {
                name: name || service[0].name,
                description: description || service[0].description,
                price: price || service[0].price,
                duration: duration || service[0].duration
            };

            await db.query(
                'UPDATE services SET name = ?, description = ?, price = ?, duration = ? WHERE id = ?',
                [updatedService.name, updatedService.description, updatedService.price, updatedService.duration, req.params.id]
            );

            res.json({
                id: parseInt(req.params.id),
                ...updatedService
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error updating service' });
        }
    },

    // Delete a service
    deleteService: async (req, res) => {
        try {
            const [service] = await db.query('SELECT * FROM services WHERE id = ?', [req.params.id]);
            
            if (service.length === 0) {
                return res.status(404).json({ message: 'Service not found' });
            }

            await db.query('DELETE FROM services WHERE id = ?', [req.params.id]);
            
            res.json({ message: 'Service deleted successfully' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error deleting service' });
        }
    }
};

module.exports = servicesController;
