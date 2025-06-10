const express = require('express');
const cors = require('cors');
require('dotenv').config();

const appointmentsRoutes = require('./routes/appointments.routes');
const servicesRoutes = require('./routes/services.routes');

const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/services', servicesRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
