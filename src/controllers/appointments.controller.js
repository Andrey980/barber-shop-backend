const db = require('../config/database');

const appointmentsController = {
    // Get appointments with optional date filter
    getAppointments: async (req, res) => {
        try {
            const { date } = req.query;
            let query = `
                SELECT a.id, a.client_name, a.service_id, a.appointment_date, a.status, a.total_value,
                       s.name as service_name, s.description as service_description, 
                       s.price as service_price, s.duration as service_duration
                FROM appointments a 
                JOIN services s ON a.service_id = s.id
            `;
            
            const queryParams = [];
            if (date) {
                query += ` WHERE DATE(a.appointment_date) = ?`;
                queryParams.push(date);
            }
            
            query += ` ORDER BY a.appointment_date ASC`;
            
            const [appointments] = await db.query(query, queryParams);
            res.json(appointments);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error fetching appointments' });
        }
    },

    // Get days that have appointments
    getDaysWithAppointments: async (req, res) => {
        try {
            const { start, end } = req.query;
            
            if (!start || !end) {
                return res.status(400).json({ message: 'Start and end dates are required' });
            }

            const [results] = await db.query(`
                SELECT DISTINCT DATE(appointment_date) as date
                FROM appointments
                WHERE DATE(appointment_date) BETWEEN ? AND ?
                ORDER BY date ASC
            `, [start, end]);

            const days = results.map(result => result.date.toISOString().split('T')[0]);
            res.json(days);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error fetching days with appointments' });
        }
    },

    // Get appointments by specific date
    getAppointmentsByDate: async (req, res) => {
        try {
            const { date } = req.params;

            const [appointments] = await db.query(`
                SELECT a.id, a.client_name, a.service_id, a.appointment_date, a.status, a.total_value,
                       s.name as service_name, s.description as service_description,
                       s.price as service_price, s.duration as service_duration
                FROM appointments a
                JOIN services s ON a.service_id = s.id
                WHERE DATE(a.appointment_date) = ?
                ORDER BY a.appointment_date ASC
            `, [date]);

            res.json(appointments);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error fetching appointments' });
        }
    },

    // Get a single appointment by ID
    getAppointmentById: async (req, res) => {
        try {
            const [appointment] = await db.query(`
                SELECT a.*, s.name as service_name, s.duration, s.price 
                FROM appointments a 
                JOIN services s ON a.service_id = s.id 
                WHERE a.id = ?
            `, [req.params.id]);
            
            if (appointment.length === 0) {
                return res.status(404).json({ message: 'Appointment not found' });
            }
            
            res.json(appointment[0]);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error fetching appointment' });
        }
    },    // Create a new appointment
    createAppointment: async (req, res) => {
        try {
            const { client_name, service_id, appointment_date } = req.body;
            
            if (!client_name || !service_id || !appointment_date) {
                return res.status(400).json({ message: 'Please provide all required fields' });
            }

            // Check if service exists and get its price
            const [service] = await db.query('SELECT * FROM services WHERE id = ?', [service_id]);
            if (service.length === 0) {
                return res.status(404).json({ message: 'Service not found' });
            }

            // Get the service price for total_value
            const total_value = service[0].price;

            // Check if the time slot is available
            const [conflictingAppointments] = await db.query(`
                SELECT * FROM appointments 
                WHERE appointment_date = ? AND service_id = ?
            `, [appointment_date, service_id]);

            if (conflictingAppointments.length > 0) {
                return res.status(400).json({ message: 'This time slot is not available' });
            }

            const [result] = await db.query(
                'INSERT INTO appointments (client_name, service_id, appointment_date, status, total_value) VALUES (?, ?, ?, ?, ?)',
                [client_name, service_id, appointment_date, 'scheduled', total_value]
            );

            const [newAppointment] = await db.query(`
                SELECT a.*, s.name as service_name, s.duration, s.price 
                FROM appointments a 
                JOIN services s ON a.service_id = s.id 
                WHERE a.id = ?
            `, [result.insertId]);

            res.status(201).json(newAppointment[0]);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error creating appointment' });
        }
    },    // Update an appointment
    updateAppointment: async (req, res) => {
        try {
            const { client_name, service_id, appointment_date, status, total_value } = req.body;
            
            if (!client_name && !service_id && !appointment_date && !status && total_value === undefined) {
                return res.status(400).json({ message: 'Please provide at least one field to update' });
            }

            const [appointment] = await db.query('SELECT * FROM appointments WHERE id = ?', [req.params.id]);
            
            if (appointment.length === 0) {
                return res.status(404).json({ message: 'Appointment not found' });
            }

            let newTotalValue = total_value !== undefined ? total_value : appointment[0].total_value;

            // If service_id is being updated and total_value wasn't provided, update total_value based on service price
            if (service_id && total_value === undefined) {
                const [service] = await db.query('SELECT * FROM services WHERE id = ?', [service_id]);
                if (service.length === 0) {
                    return res.status(404).json({ message: 'Service not found' });
                }
                newTotalValue = service[0].price;
            }

            const updatedAppointment = {
                client_name: client_name || appointment[0].client_name,
                service_id: service_id || appointment[0].service_id,
                appointment_date: appointment_date || appointment[0].appointment_date,
                status: status || appointment[0].status,
                total_value: newTotalValue
            };

            await db.query(
                'UPDATE appointments SET client_name = ?, service_id = ?, appointment_date = ?, status = ?, total_value = ? WHERE id = ?',
                [updatedAppointment.client_name, updatedAppointment.service_id, updatedAppointment.appointment_date, updatedAppointment.status, updatedAppointment.total_value, req.params.id]
            );

            const [updated] = await db.query(`
                SELECT a.*, s.name as service_name, s.duration, s.price 
                FROM appointments a 
                JOIN services s ON a.service_id = s.id 
                WHERE a.id = ?
            `, [req.params.id]);

            res.json(updated[0]);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error updating appointment' });
        }
    },

    // Delete an appointment
    deleteAppointment: async (req, res) => {
        try {
            const [appointment] = await db.query('SELECT * FROM appointments WHERE id = ?', [req.params.id]);
            
            if (appointment.length === 0) {
                return res.status(404).json({ message: 'Appointment not found' });
            }

            await db.query('DELETE FROM appointments WHERE id = ?', [req.params.id]);
            
            res.json({ message: 'Appointment deleted successfully' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error deleting appointment' });
        }
    }
};

module.exports = appointmentsController;
