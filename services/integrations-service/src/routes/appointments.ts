import { Router } from 'express';
import { db } from '../db';
import { appointments } from '../schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { publishToKafka } from '../kafka';

const router = Router();

/**
 * POST /appointments
 * Create a new appointment booking
 */
router.post('/', async (req, res) => {
  try {
    const {
      micrositeId,
      creatorId,
      customerName,
      customerEmail,
      customerPhone,
      serviceId,
      serviceName,
      serviceType,
      duration,
      price,
      appointmentDate,
      appointmentTime,
      notes,
      timezone,
      calendarType,
      metadata,
    } = req.body;

    // Validate required fields
    if (!micrositeId || !creatorId || !customerEmail || !serviceName || !appointmentDate || !appointmentTime) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['micrositeId', 'creatorId', 'customerEmail', 'serviceName', 'appointmentDate', 'appointmentTime']
      });
    }

    // Check for existing appointment at same time
    const existingAppointment = await db.query.appointments.findFirst({
      where: and(
        eq(appointments.creatorId, creatorId),
        eq(appointments.appointmentDate, new Date(appointmentDate)),
        eq(appointments.appointmentTime, appointmentTime),
        eq(appointments.status, 'confirmed')
      )
    });

    if (existingAppointment) {
      return res.status(409).json({
        error: 'Time slot already booked',
        message: 'This time slot is no longer available. Please select a different time.'
      });
    }

    // Create appointment
    const appointmentId = uuidv4();
    const [appointment] = await db.insert(appointments).values({
      id: appointmentId,
      micrositeId,
      creatorId,
      customerName: customerName || 'Guest',
      customerEmail,
      customerPhone,
      serviceId,
      serviceName,
      serviceType: serviceType || 'video',
      duration: duration || 30,
      price: price || 0,
      appointmentDate: new Date(appointmentDate),
      appointmentTime,
      notes,
      timezone: timezone || 'UTC',
      calendarType,
      status: 'confirmed',
      paymentStatus: price > 0 ? 'pending' : 'not_required',
      metadata: metadata || {},
    }).returning();

    // Publish event to Kafka for email notifications
    await publishToKafka('appointment.booked', {
      appointmentId: appointment.id,
      creatorId,
      micrositeId,
      customerName: appointment.customerName,
      customerEmail: appointment.customerEmail,
      serviceName: appointment.serviceName,
      appointmentDate: appointment.appointmentDate.toISOString(),
      appointmentTime: appointment.appointmentTime,
      duration: appointment.duration,
      price: appointment.price,
      calendarType,
      timezone: appointment.timezone,
      metadata: appointment.metadata,
    });

    return res.status(201).json({
      success: true,
      appointment: {
        id: appointment.id,
        serviceName: appointment.serviceName,
        appointmentDate: appointment.appointmentDate,
        appointmentTime: appointment.appointmentTime,
        duration: appointment.duration,
        status: appointment.status,
        confirmationCode: appointment.id.split('-')[0].toUpperCase(),
      }
    });

  } catch (error) {
    console.error('Error creating appointment:', error);
    return res.status(500).json({
      error: 'Failed to create appointment',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /appointments/:id
 * Get appointment details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await db.query.appointments.findFirst({
      where: eq(appointments.id, id)
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    return res.json({
      success: true,
      appointment
    });

  } catch (error) {
    console.error('Error fetching appointment:', error);
    return res.status(500).json({ error: 'Failed to fetch appointment' });
  }
});

/**
 * GET /appointments/creator/:creatorId
 * Get all appointments for a creator
 */
router.get('/creator/:creatorId', async (req, res) => {
  try {
    const { creatorId } = req.params;
    const { startDate, endDate, status } = req.query;

    let whereConditions = [eq(appointments.creatorId, creatorId)];

    if (startDate) {
      whereConditions.push(gte(appointments.appointmentDate, new Date(startDate as string)));
    }
    if (endDate) {
      whereConditions.push(lte(appointments.appointmentDate, new Date(endDate as string)));
    }
    if (status) {
      whereConditions.push(eq(appointments.status, status as string));
    }

    const creatorAppointments = await db.query.appointments.findMany({
      where: and(...whereConditions),
      orderBy: [desc(appointments.appointmentDate), desc(appointments.appointmentTime)]
    });

    return res.json({
      success: true,
      count: creatorAppointments.length,
      appointments: creatorAppointments
    });

  } catch (error) {
    console.error('Error fetching creator appointments:', error);
    return res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

/**
 * PATCH /appointments/:id/cancel
 * Cancel an appointment
 */
router.patch('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { canceledBy, cancelReason } = req.body;

    const [updatedAppointment] = await db.update(appointments)
      .set({
        status: 'canceled',
        canceledAt: new Date(),
        canceledBy: canceledBy || 'customer',
        cancelReason,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, id))
      .returning();

    if (!updatedAppointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Publish cancellation event
    await publishToKafka('appointment.canceled', {
      appointmentId: updatedAppointment.id,
      creatorId: updatedAppointment.creatorId,
      customerEmail: updatedAppointment.customerEmail,
      serviceName: updatedAppointment.serviceName,
      appointmentDate: updatedAppointment.appointmentDate.toISOString(),
      appointmentTime: updatedAppointment.appointmentTime,
      canceledBy,
      cancelReason,
    });

    return res.json({
      success: true,
      message: 'Appointment canceled successfully',
      appointment: updatedAppointment
    });

  } catch (error) {
    console.error('Error canceling appointment:', error);
    return res.status(500).json({ error: 'Failed to cancel appointment' });
  }
});

/**
 * PATCH /appointments/:id/reschedule
 * Reschedule an appointment
 */
router.patch('/:id/reschedule', async (req, res) => {
  try {
    const { id } = req.params;
    const { appointmentDate, appointmentTime, reason } = req.body;

    if (!appointmentDate || !appointmentTime) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['appointmentDate', 'appointmentTime']
      });
    }

    const appointment = await db.query.appointments.findFirst({
      where: eq(appointments.id, id)
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Check new time slot availability
    const conflictingAppointment = await db.query.appointments.findFirst({
      where: and(
        eq(appointments.creatorId, appointment.creatorId),
        eq(appointments.appointmentDate, new Date(appointmentDate)),
        eq(appointments.appointmentTime, appointmentTime),
        eq(appointments.status, 'confirmed')
      )
    });

    if (conflictingAppointment && conflictingAppointment.id !== id) {
      return res.status(409).json({
        error: 'Time slot already booked',
        message: 'The new time slot is not available.'
      });
    }

    const [updatedAppointment] = await db.update(appointments)
      .set({
        appointmentDate: new Date(appointmentDate),
        appointmentTime,
        status: 'confirmed',
        updatedAt: new Date(),
        metadata: {
          ...appointment.metadata as object,
          rescheduledFrom: {
            date: appointment.appointmentDate,
            time: appointment.appointmentTime,
            reason,
          }
        }
      })
      .where(eq(appointments.id, id))
      .returning();

    // Publish rescheduled event
    await publishToKafka('appointment.rescheduled', {
      appointmentId: updatedAppointment.id,
      creatorId: updatedAppointment.creatorId,
      customerEmail: updatedAppointment.customerEmail,
      serviceName: updatedAppointment.serviceName,
      oldDate: appointment.appointmentDate.toISOString(),
      oldTime: appointment.appointmentTime,
      newDate: appointmentDate,
      newTime: appointmentTime,
      reason,
    });

    return res.json({
      success: true,
      message: 'Appointment rescheduled successfully',
      appointment: updatedAppointment
    });

  } catch (error) {
    console.error('Error rescheduling appointment:', error);
    return res.status(500).json({ error: 'Failed to reschedule appointment' });
  }
});

/**
 * GET /appointments/availability/:creatorId
 * Check availability for a specific date
 */
router.get('/availability/:creatorId', async (req, res) => {
  try {
    const { creatorId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Date parameter required' });
    }

    // Get all booked appointments for the date
    const bookedAppointments = await db.query.appointments.findMany({
      where: and(
        eq(appointments.creatorId, creatorId),
        eq(appointments.appointmentDate, new Date(date as string)),
        eq(appointments.status, 'confirmed')
      )
    });

    const bookedTimes = bookedAppointments.map(apt => apt.appointmentTime);

    return res.json({
      success: true,
      date,
      bookedTimes,
      availableSlots: [], // Frontend will calculate based on business hours
    });

  } catch (error) {
    console.error('Error checking availability:', error);
    return res.status(500).json({ error: 'Failed to check availability' });
  }
});

export default router;
