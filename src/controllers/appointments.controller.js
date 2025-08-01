const db = require('../config/database');

const appointmentsController = {
    // Get appointments with optional date filter
    getAppointments: async (req, res) => {
        try {
            const { date } = req.query;
            let query = `
                SELECT a.id, a.client_name, a.service_id, a.professional_id, a.appointment_date, a.status, a.total_value,
                       s.name as service_name, s.description as service_description, 
                       s.price as service_price, s.duration as service_duration,
                       p.nome as professional_name
                FROM appointments a 
                JOIN services s ON a.service_id = s.id
                LEFT JOIN professionals p ON a.professional_id = p.id
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
                SELECT a.id, a.client_name, a.service_id, a.professional_id, a.appointment_date, a.status, a.total_value,
                       s.name as service_name, s.description as service_description,
                       s.price as service_price, s.duration as service_duration,
                       p.nome as professional_name
                FROM appointments a
                JOIN services s ON a.service_id = s.id
                LEFT JOIN professionals p ON a.professional_id = p.id
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
                SELECT a.*, s.name as service_name, s.duration, s.price,
                       p.nome as professional_name
                FROM appointments a 
                JOIN services s ON a.service_id = s.id 
                LEFT JOIN professionals p ON a.professional_id = p.id
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
            const { client_name, client_phone, service_id, professional_id, appointment_date, status = 'scheduled', total_value } = req.body;

            if (!client_name || !client_phone || !service_id || !appointment_date) {
                return res.status(400).json({ message: 'Please provide all required fields' });
            }

            // Check if service exists and get its price
            const [service] = await db.query('SELECT * FROM services WHERE id = ?', [service_id]);
            if (service.length === 0) {
                return res.status(404).json({ message: 'Service not found' });
            }

            // Check if professional exists (if provided)
            if (professional_id) {
                const [professional] = await db.query('SELECT * FROM professionals WHERE id = ? AND status = ?', [professional_id, 'ativo']);
                if (professional.length === 0) {
                    return res.status(404).json({ message: 'Professional not found or inactive' });
                }
            }

            // Use provided total_value or fall back to service price
            const finalTotalValue = total_value !== undefined ? total_value : service[0].price;

            // Check if the time slot is available for the specific professional (if provided)
            let conflictQuery = `
                SELECT * FROM appointments 
                WHERE appointment_date = ? AND status != 'cancelled'
            `;
            let conflictParams = [appointment_date];

            if (professional_id) {
                conflictQuery += ` AND professional_id = ?`;
                conflictParams.push(professional_id);
            }

            const [conflictingAppointments] = await db.query(conflictQuery, conflictParams);

            if (conflictingAppointments.length > 0) {
                return res.status(400).json({ message: 'This time slot is not available for the selected professional' });
            }

            const [result] = await db.query(
                'INSERT INTO appointments (client_name, client_phone, service_id, professional_id, appointment_date, status, total_value) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [client_name, client_phone, service_id, professional_id || null, appointment_date, status, finalTotalValue]
            );

            const [newAppointment] = await db.query(`
                SELECT a.*, s.name as service_name, s.duration, s.price,
                       p.nome as professional_name
                FROM appointments a 
                JOIN services s ON a.service_id = s.id 
                LEFT JOIN professionals p ON a.professional_id = p.id
                WHERE a.id = ?
            `, [result.insertId]);

            res.status(201).json(newAppointment[0]);
        } catch (error) {
            console.error('Error creating appointment:', error);
            res.status(500).json({ message: 'Error creating appointment', error: error.message });
        }
    },    // Update an appointment
    updateAppointment: async (req, res) => {
        try {
            const { client_name, client_phone, service_id, appointment_date, status, total_value } = req.body;

            if (!client_name && !client_phone && !service_id && !appointment_date && !status && total_value === undefined) {
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
                client_phone: client_phone || appointment[0].client_phone,
                service_id: service_id || appointment[0].service_id,
                appointment_date: appointment_date || appointment[0].appointment_date,
                status: status || appointment[0].status,
                total_value: newTotalValue
            };

            await db.query(
                'UPDATE appointments SET client_name = ?, client_phone = ?, service_id = ?, appointment_date = ?, status = ?, total_value = ? WHERE id = ?',
                [updatedAppointment.client_name, updatedAppointment.client_phone, updatedAppointment.service_id, updatedAppointment.appointment_date, updatedAppointment.status, updatedAppointment.total_value, req.params.id]
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
    },

    // Get appointment statistics for a specific year and month
    getAppointmentStats: async (req, res) => {
        try {
            const { year, month } = req.query;
            
            if (!year || !month) {
                return res.status(400).json({ message: 'Year and month are required' });
            }

            const [stats] = await db.query(`
                SELECT 
                    COUNT(*) as total_appointments,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_appointments,
                    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_appointments,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_appointments,
                    AVG(total_value) as average_value
                FROM appointments
                WHERE YEAR(appointment_date) = ? AND MONTH(appointment_date) = ?
            `, [year, month]);

            res.json(stats[0]);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error fetching appointment statistics' });
        }
    },

    // Get monthly revenue for a specific year and month
    getMonthlyRevenue: async (req, res) => {
        try {
            const { year, month } = req.query;
            
            if (!year || !month) {
                return res.status(400).json({ message: 'Year and month are required' });
            }

            const [revenue] = await db.query(`
                SELECT 
                    DAY(appointment_date) as day,
                    COUNT(*) as appointments_count,
                    SUM(total_value) as daily_revenue
                FROM appointments
                WHERE YEAR(appointment_date) = ? 
                AND MONTH(appointment_date) = ?
                AND status = 'completed'
                GROUP BY DAY(appointment_date)
                ORDER BY day ASC
            `, [year, month]);

            res.json(revenue);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error fetching monthly revenue' });
        }
    },

    // Get revenue by services for a specific year and month
    getServiceRevenue: async (req, res) => {
        try {
            const { year, month } = req.query;
            
            if (!year || !month) {
                return res.status(400).json({ message: 'Year and month are required' });
            }

            const [revenue] = await db.query(`
                SELECT 
                    s.id as service_id,
                    s.name as service_name,
                    COUNT(*) as appointment_count,
                    SUM(a.total_value) as total_revenue
                FROM appointments a
                JOIN services s ON a.service_id = s.id
                WHERE YEAR(a.appointment_date) = ? 
                AND MONTH(a.appointment_date) = ?
                AND a.status = 'completed'
                GROUP BY s.id, s.name
                ORDER BY total_revenue DESC
            `, [year, month]);

            res.json(revenue);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error fetching service revenue' });
        }
    },

    // Get appointments by professional
    getAppointmentsByProfessional: async (req, res) => {
        try {
            const { professionalId } = req.params;
            const { date } = req.query;

            let query = `
                SELECT a.id, a.client_name, a.service_id, a.professional_id, a.appointment_date, a.status, a.total_value,
                       s.name as service_name, s.description as service_description,
                       s.price as service_price, s.duration as service_duration,
                       p.nome as professional_name
                FROM appointments a
                JOIN services s ON a.service_id = s.id
                LEFT JOIN professionals p ON a.professional_id = p.id
                WHERE a.professional_id = ?
            `;
            
            const queryParams = [professionalId];
            
            if (date) {
                query += ` AND DATE(a.appointment_date) = ?`;
                queryParams.push(date);
            }
            
            query += ` ORDER BY a.appointment_date ASC`;

            const [appointments] = await db.query(query, queryParams);
            res.json(appointments);
        } catch (error) {
            console.error('Error fetching appointments by professional:', error);
            res.status(500).json({ message: 'Error fetching appointments by professional' });
        }
    },
};

module.exports = appointmentsController;
