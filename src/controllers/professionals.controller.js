const db = require('../config/database');

const professionalsController = {
    // Get all professionals
    getProfessionals: async (req, res) => {
        try {
            const [professionals] = await db.query(`
                SELECT 
                    id,
                    nome as name,
                    email,
                    telefone as phone,
                    status,
                    'Barbeiro' as specialty,
                    '5+ anos' as experience,
                    4.5 as rating,
                    CASE WHEN status = 'ativo' THEN true ELSE false END as available
                FROM professionals
                ORDER BY nome ASC
            `);

            // Get services for each professional
            for (let professional of professionals) {
                const [services] = await db.query(`
                    SELECT service_id
                    FROM professional_services
                    WHERE professional_id = ?
                `, [professional.id]);
                
                professional.services = services.map(s => parseInt(s.service_id));
            }

            res.json(professionals);
        } catch (error) {
            console.error('Error fetching professionals:', error);
            res.status(500).json({ message: 'Error fetching professionals' });
        }
    },

    // Get professional by ID
    getProfessionalById: async (req, res) => {
        try {
            const { id } = req.params;

            const [professional] = await db.query(`
                SELECT 
                    id,
                    nome as name,
                    email,
                    telefone as phone,
                    status,
                    'Barbeiro' as specialty,
                    '5+ anos' as experience,
                    4.5 as rating,
                    CASE WHEN status = 'ativo' THEN true ELSE false END as available
                FROM professionals
                WHERE id = ?
            `, [id]);

            if (professional.length === 0) {
                return res.status(404).json({ message: 'Professional not found' });
            }

            // Get services for this professional
            const [services] = await db.query(`
                SELECT service_id
                FROM professional_services
                WHERE professional_id = ?
            `, [id]);
            
            professional[0].services = services.map(s => parseInt(s.service_id));

            res.json(professional[0]);
        } catch (error) {
            console.error('Error fetching professional:', error);
            res.status(500).json({ message: 'Error fetching professional' });
        }
    },

    // Create a new professional
    createProfessional: async (req, res) => {
        try {
            const { name, email, phone, status = 'ativo', services = [] } = req.body;

            if (!name || !email || !phone) {
                return res.status(400).json({ 
                    message: 'Nome, email e telefone são obrigatórios' 
                });
            }

            // Check if email already exists
            const [existingProfessional] = await db.query(
                'SELECT id FROM professionals WHERE email = ?',
                [email]
            );

            if (existingProfessional.length > 0) {
                return res.status(400).json({ 
                    message: 'Email já está em uso' 
                });
            }

            const [result] = await db.query(`
                INSERT INTO professionals (nome, email, telefone, status)
                VALUES (?, ?, ?, ?)
            `, [name, email, phone, status]);

            const professionalId = result.insertId;

            // Associate services with the professional
            if (services && services.length > 0) {
                const serviceInserts = services.map(serviceId => [professionalId, serviceId]);
                await db.query(`
                    INSERT INTO professional_services (professional_id, service_id)
                    VALUES ?
                `, [serviceInserts]);
            }

            const [newProfessional] = await db.query(`
                SELECT 
                    id,
                    nome as name,
                    email,
                    telefone as phone,
                    status,
                    'Barbeiro' as specialty,
                    '5+ anos' as experience,
                    4.5 as rating,
                    CASE WHEN status = 'ativo' THEN true ELSE false END as available
                FROM professionals
                WHERE id = ?
            `, [professionalId]);

            // Get services for the new professional
            const [professionalServices] = await db.query(`
                SELECT service_id
                FROM professional_services
                WHERE professional_id = ?
            `, [professionalId]);
            
            newProfessional[0].services = professionalServices.map(s => parseInt(s.service_id));

            res.status(201).json(newProfessional[0]);
        } catch (error) {
            console.error('Error creating professional:', error);
            res.status(500).json({ message: 'Error creating professional' });
        }
    },

    // Update a professional
    updateProfessional: async (req, res) => {
        try {
            const { id } = req.params;
            const { name, email, phone, status, services } = req.body;

            // Check if professional exists
            const [existingProfessional] = await db.query(
                'SELECT id FROM professionals WHERE id = ?',
                [id]
            );

            if (existingProfessional.length === 0) {
                return res.status(404).json({ message: 'Professional not found' });
            }

            // Check if email is being changed and if it's already in use
            if (email) {
                const [emailCheck] = await db.query(
                    'SELECT id FROM professionals WHERE email = ? AND id != ?',
                    [email, id]
                );

                if (emailCheck.length > 0) {
                    return res.status(400).json({ 
                        message: 'Email já está em uso por outro profissional' 
                    });
                }
            }

            // Build update query dynamically
            const updates = [];
            const values = [];

            if (name) {
                updates.push('nome = ?');
                values.push(name);
            }
            if (email) {
                updates.push('email = ?');
                values.push(email);
            }
            if (phone) {
                updates.push('telefone = ?');
                values.push(phone);
            }
            if (status) {
                updates.push('status = ?');
                values.push(status);
            }

            if (updates.length > 0) {
                values.push(id);
                await db.query(`
                    UPDATE professionals 
                    SET ${updates.join(', ')}
                    WHERE id = ?
                `, values);
            }

            // Update services if provided
            if (services !== undefined) {
                // Remove existing service associations
                await db.query(`
                    DELETE FROM professional_services 
                    WHERE professional_id = ?
                `, [id]);

                // Add new service associations
                if (services.length > 0) {
                    const serviceInserts = services.map(serviceId => [id, serviceId]);
                    await db.query(`
                        INSERT INTO professional_services (professional_id, service_id)
                        VALUES ?
                    `, [serviceInserts]);
                }
            }

            // Get updated professional
            const [updatedProfessional] = await db.query(`
                SELECT 
                    id,
                    nome as name,
                    email,
                    telefone as phone,
                    status,
                    'Barbeiro' as specialty,
                    '5+ anos' as experience,
                    4.5 as rating,
                    CASE WHEN status = 'ativo' THEN true ELSE false END as available
                FROM professionals
                WHERE id = ?
            `, [id]);

            // Get services for the updated professional
            const [professionalServices] = await db.query(`
                SELECT service_id
                FROM professional_services
                WHERE professional_id = ?
            `, [id]);
            
            updatedProfessional[0].services = professionalServices.map(s => parseInt(s.service_id));

            res.json(updatedProfessional[0]);
        } catch (error) {
            console.error('Error updating professional:', error);
            res.status(500).json({ message: 'Error updating professional' });
        }
    },

    // Delete a professional (soft delete by setting status to 'inativo')
    deleteProfessional: async (req, res) => {
        try {
            const { id } = req.params;

            // Check if professional exists
            const [existingProfessional] = await db.query(
                'SELECT id FROM professionals WHERE id = ?',
                [id]
            );

            if (existingProfessional.length === 0) {
                return res.status(404).json({ message: 'Professional not found' });
            }

            // Soft delete by setting status to 'inativo'
            await db.query(`
                UPDATE professionals 
                SET status = 'inativo'
                WHERE id = ?
            `, [id]);

            res.json({ message: 'Professional deactivated successfully' });
        } catch (error) {
            console.error('Error deleting professional:', error);
            res.status(500).json({ message: 'Error deleting professional' });
        }
    },

    // Get only active professionals
    getActiveProfessionals: async (req, res) => {
        try {
            const [professionals] = await db.query(`
                SELECT 
                    id,
                    nome as name,
                    email,
                    telefone as phone,
                    status,
                    'Barbeiro' as specialty,
                    '5+ anos' as experience,
                    4.5 as rating,
                    CASE WHEN status = 'ativo' THEN true ELSE false END as available
                FROM professionals
                WHERE status = 'ativo'
                ORDER BY nome ASC
            `);

            // Get services for each professional
            for (let professional of professionals) {
                const [services] = await db.query(`
                    SELECT service_id
                    FROM professional_services
                    WHERE professional_id = ?
                `, [professional.id]);
                
                professional.services = services.map(s => parseInt(s.service_id));
            }

            res.json(professionals);
        } catch (error) {
            console.error('Error fetching active professionals:', error);
            res.status(500).json({ message: 'Error fetching active professionals' });
        }
    }
};

module.exports = professionalsController;
