import { FastifyInstance } from 'fastify';
import QRCode from 'qrcode';

// Offline QR code types (no internet required to use)
interface WiFiQRConfig {
  type: 'wifi';
  ssid: string;
  password: string;
  encryption: 'WPA' | 'WEP' | 'nopass';
  hidden?: boolean;
}

interface VCardQRConfig {
  type: 'vcard';
  firstName: string;
  lastName: string;
  organization?: string;
  title?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  note?: string;
}

interface EventQRConfig {
  type: 'event';
  title: string;
  description?: string;
  location?: string;
  startDate: string;
  endDate?: string;
  organizer?: string;
}

interface SMSQRConfig {
  type: 'sms';
  phoneNumber: string;
  message?: string;
}

interface EmailQRConfig {
  type: 'email';
  email: string;
  subject?: string;
  body?: string;
}

interface PhoneQRConfig {
  type: 'phone';
  phoneNumber: string;
}

interface TextQRConfig {
  type: 'text';
  text: string;
}

interface LocationQRConfig {
  type: 'location';
  latitude: number;
  longitude: number;
  label?: string;
}

type OfflineQRConfig =
  | WiFiQRConfig
  | VCardQRConfig
  | EventQRConfig
  | SMSQRConfig
  | EmailQRConfig
  | PhoneQRConfig
  | TextQRConfig
  | LocationQRConfig;

interface OfflineQR {
  id: string;
  name: string;
  type: OfflineQRConfig['type'];
  config: OfflineQRConfig;
  qrDataString: string;
  createdAt: Date;
  downloadUrl: string;
}

// Storage
const offlineQRs = new Map<string, OfflineQR>();

export default async function offlineQRRoutes(fastify: FastifyInstance) {
  
  // 1. Generate WiFi QR Code
  fastify.post<{
    Body: {
      name?: string;
      ssid: string;
      password: string;
      encryption?: 'WPA' | 'WEP' | 'nopass';
      hidden?: boolean;
      format?: 'png' | 'svg';
    };
  }>('/offline-qr/wifi', async (request, reply) => {
    const { name, ssid, password, encryption = 'WPA', hidden = false, format = 'png' } = request.body;

    // WiFi QR format: WIFI:T:WPA;S:mynetwork;P:mypass;H:false;
    const hiddenFlag = hidden ? 'true' : 'false';
    const qrDataString = `WIFI:T:${encryption};S:${ssid};P:${password};H:${hiddenFlag};`;

    const id = `wifi_${Math.random().toString(36).substring(7)}`;
    const config: WiFiQRConfig = {
      type: 'wifi',
      ssid,
      password,
      encryption,
      hidden,
    };

    const offlineQR: OfflineQR = {
      id,
      name: name || `WiFi: ${ssid}`,
      type: 'wifi',
      config,
      qrDataString,
      createdAt: new Date(),
      downloadUrl: `/offline-qr/download/${id}`,
    };

    offlineQRs.set(id, offlineQR);

    // Generate QR code
    let qrCode: string;
    if (format === 'svg') {
      qrCode = await QRCode.toString(qrDataString, { type: 'svg' });
    } else {
      qrCode = await QRCode.toDataURL(qrDataString, {
        errorCorrectionLevel: 'H',
        width: 512,
      });
    }

    return {
      ...offlineQR,
      qrCode,
      format,
      instructions: 'Scan this QR code to automatically connect to the WiFi network',
    };
  });

  // 2. Generate vCard (Contact) QR Code
  fastify.post<{
    Body: {
      name?: string;
      firstName: string;
      lastName: string;
      organization?: string;
      title?: string;
      phone?: string;
      email?: string;
      website?: string;
      address?: VCardQRConfig['address'];
      note?: string;
      format?: 'png' | 'svg';
    };
  }>('/offline-qr/vcard', async (request, reply) => {
    const { name, firstName, lastName, organization, title, phone, email, website, address, note, format = 'png' } =
      request.body;

    // vCard 3.0 format
    const vcard = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `N:${lastName};${firstName};;;`,
      `FN:${firstName} ${lastName}`,
    ];

    if (organization) vcard.push(`ORG:${organization}`);
    if (title) vcard.push(`TITLE:${title}`);
    if (phone) vcard.push(`TEL:${phone}`);
    if (email) vcard.push(`EMAIL:${email}`);
    if (website) vcard.push(`URL:${website}`);
    if (address) {
      const { street = '', city = '', state = '', zip = '', country = '' } = address;
      vcard.push(`ADR:;;${street};${city};${state};${zip};${country}`);
    }
    if (note) vcard.push(`NOTE:${note}`);
    vcard.push('END:VCARD');

    const qrDataString = vcard.join('\n');

    const id = `vcard_${Math.random().toString(36).substring(7)}`;
    const config: VCardQRConfig = {
      type: 'vcard',
      firstName,
      lastName,
      organization,
      title,
      phone,
      email,
      website,
      address,
      note,
    };

    const offlineQR: OfflineQR = {
      id,
      name: name || `Contact: ${firstName} ${lastName}`,
      type: 'vcard',
      config,
      qrDataString,
      createdAt: new Date(),
      downloadUrl: `/offline-qr/download/${id}`,
    };

    offlineQRs.set(id, offlineQR);

    // Generate QR code
    let qrCode: string;
    if (format === 'svg') {
      qrCode = await QRCode.toString(qrDataString, { type: 'svg' });
    } else {
      qrCode = await QRCode.toDataURL(qrDataString, {
        errorCorrectionLevel: 'H',
        width: 512,
      });
    }

    return {
      ...offlineQR,
      qrCode,
      format,
      instructions: 'Scan this QR code to save the contact to your phone',
    };
  });

  // 3. Generate Calendar Event QR Code
  fastify.post<{
    Body: {
      name?: string;
      title: string;
      description?: string;
      location?: string;
      startDate: string;
      endDate?: string;
      organizer?: string;
      format?: 'png' | 'svg';
    };
  }>('/offline-qr/event', async (request, reply) => {
    const { name, title, description, location, startDate, endDate, organizer, format = 'png' } = request.body;

    // iCalendar format
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const ical = [
      'BEGIN:VEVENT',
      `SUMMARY:${title}`,
      description ? `DESCRIPTION:${description}` : null,
      location ? `LOCATION:${location}` : null,
      `DTSTART:${formatDate(startDate)}`,
      endDate ? `DTEND:${formatDate(endDate)}` : null,
      organizer ? `ORGANIZER:${organizer}` : null,
      'END:VEVENT',
    ]
      .filter(Boolean)
      .join('\n');

    const qrDataString = ical;

    const id = `event_${Math.random().toString(36).substring(7)}`;
    const config: EventQRConfig = {
      type: 'event',
      title,
      description,
      location,
      startDate,
      endDate,
      organizer,
    };

    const offlineQR: OfflineQR = {
      id,
      name: name || `Event: ${title}`,
      type: 'event',
      config,
      qrDataString,
      createdAt: new Date(),
      downloadUrl: `/offline-qr/download/${id}`,
    };

    offlineQRs.set(id, offlineQR);

    // Generate QR code
    let qrCode: string;
    if (format === 'svg') {
      qrCode = await QRCode.toString(qrDataString, { type: 'svg' });
    } else {
      qrCode = await QRCode.toDataURL(qrDataString, {
        errorCorrectionLevel: 'M',
        width: 512,
      });
    }

    return {
      ...offlineQR,
      qrCode,
      format,
      instructions: 'Scan this QR code to add the event to your calendar',
    };
  });

  // 4. Generate SMS QR Code
  fastify.post<{
    Body: {
      name?: string;
      phoneNumber: string;
      message?: string;
      format?: 'png' | 'svg';
    };
  }>('/offline-qr/sms', async (request, reply) => {
    const { name, phoneNumber, message, format = 'png' } = request.body;

    // SMS format: smsto:+1234567890:Hello
    const qrDataString = message ? `smsto:${phoneNumber}:${message}` : `smsto:${phoneNumber}`;

    const id = `sms_${Math.random().toString(36).substring(7)}`;
    const config: SMSQRConfig = {
      type: 'sms',
      phoneNumber,
      message,
    };

    const offlineQR: OfflineQR = {
      id,
      name: name || `SMS: ${phoneNumber}`,
      type: 'sms',
      config,
      qrDataString,
      createdAt: new Date(),
      downloadUrl: `/offline-qr/download/${id}`,
    };

    offlineQRs.set(id, offlineQR);

    // Generate QR code
    let qrCode: string;
    if (format === 'svg') {
      qrCode = await QRCode.toString(qrDataString, { type: 'svg' });
    } else {
      qrCode = await QRCode.toDataURL(qrDataString, { width: 512 });
    }

    return {
      ...offlineQR,
      qrCode,
      format,
      instructions: 'Scan this QR code to send an SMS',
    };
  });

  // 5. Generate Email QR Code
  fastify.post<{
    Body: {
      name?: string;
      email: string;
      subject?: string;
      body?: string;
      format?: 'png' | 'svg';
    };
  }>('/offline-qr/email', async (request, reply) => {
    const { name, email, subject, body, format = 'png' } = request.body;

    // mailto format
    const params = [];
    if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
    if (body) params.push(`body=${encodeURIComponent(body)}`);

    const qrDataString = params.length > 0 ? `mailto:${email}?${params.join('&')}` : `mailto:${email}`;

    const id = `email_${Math.random().toString(36).substring(7)}`;
    const config: EmailQRConfig = {
      type: 'email',
      email,
      subject,
      body,
    };

    const offlineQR: OfflineQR = {
      id,
      name: name || `Email: ${email}`,
      type: 'email',
      config,
      qrDataString,
      createdAt: new Date(),
      downloadUrl: `/offline-qr/download/${id}`,
    };

    offlineQRs.set(id, offlineQR);

    // Generate QR code
    let qrCode: string;
    if (format === 'svg') {
      qrCode = await QRCode.toString(qrDataString, { type: 'svg' });
    } else {
      qrCode = await QRCode.toDataURL(qrDataString, { width: 512 });
    }

    return {
      ...offlineQR,
      qrCode,
      format,
      instructions: 'Scan this QR code to compose an email',
    };
  });

  // 6. Generate Phone Call QR Code
  fastify.post<{
    Body: {
      name?: string;
      phoneNumber: string;
      format?: 'png' | 'svg';
    };
  }>('/offline-qr/phone', async (request, reply) => {
    const { name, phoneNumber, format = 'png' } = request.body;

    const qrDataString = `tel:${phoneNumber}`;

    const id = `phone_${Math.random().toString(36).substring(7)}`;
    const config: PhoneQRConfig = {
      type: 'phone',
      phoneNumber,
    };

    const offlineQR: OfflineQR = {
      id,
      name: name || `Phone: ${phoneNumber}`,
      type: 'phone',
      config,
      qrDataString,
      createdAt: new Date(),
      downloadUrl: `/offline-qr/download/${id}`,
    };

    offlineQRs.set(id, offlineQR);

    // Generate QR code
    let qrCode: string;
    if (format === 'svg') {
      qrCode = await QRCode.toString(qrDataString, { type: 'svg' });
    } else {
      qrCode = await QRCode.toDataURL(qrDataString, { width: 512 });
    }

    return {
      ...offlineQR,
      qrCode,
      format,
      instructions: 'Scan this QR code to make a phone call',
    };
  });

  // 7. Generate Plain Text QR Code
  fastify.post<{
    Body: {
      name?: string;
      text: string;
      format?: 'png' | 'svg';
    };
  }>('/offline-qr/text', async (request, reply) => {
    const { name, text, format = 'png' } = request.body;

    const qrDataString = text;

    const id = `text_${Math.random().toString(36).substring(7)}`;
    const config: TextQRConfig = {
      type: 'text',
      text,
    };

    const offlineQR: OfflineQR = {
      id,
      name: name || `Text: ${text.substring(0, 30)}...`,
      type: 'text',
      config,
      qrDataString,
      createdAt: new Date(),
      downloadUrl: `/offline-qr/download/${id}`,
    };

    offlineQRs.set(id, offlineQR);

    // Generate QR code
    let qrCode: string;
    if (format === 'svg') {
      qrCode = await QRCode.toString(qrDataString, { type: 'svg' });
    } else {
      qrCode = await QRCode.toDataURL(qrDataString, { width: 512 });
    }

    return {
      ...offlineQR,
      qrCode,
      format,
      instructions: 'Scan this QR code to view the text',
    };
  });

  // 8. Generate Location/GPS QR Code
  fastify.post<{
    Body: {
      name?: string;
      latitude: number;
      longitude: number;
      label?: string;
      format?: 'png' | 'svg';
    };
  }>('/offline-qr/location', async (request, reply) => {
    const { name, latitude, longitude, label, format = 'png' } = request.body;

    // geo URI format
    const qrDataString = label
      ? `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodeURIComponent(label)})`
      : `geo:${latitude},${longitude}`;

    const id = `location_${Math.random().toString(36).substring(7)}`;
    const config: LocationQRConfig = {
      type: 'location',
      latitude,
      longitude,
      label,
    };

    const offlineQR: OfflineQR = {
      id,
      name: name || `Location: ${label || `${latitude}, ${longitude}`}`,
      type: 'location',
      config,
      qrDataString,
      createdAt: new Date(),
      downloadUrl: `/offline-qr/download/${id}`,
    };

    offlineQRs.set(id, offlineQR);

    // Generate QR code
    let qrCode: string;
    if (format === 'svg') {
      qrCode = await QRCode.toString(qrDataString, { type: 'svg' });
    } else {
      qrCode = await QRCode.toDataURL(qrDataString, { width: 512 });
    }

    return {
      ...offlineQR,
      qrCode,
      format,
      instructions: 'Scan this QR code to view the location on a map',
    };
  });

  // 9. Get all offline QR codes
  fastify.get<{
    Querystring: {
      type?: OfflineQRConfig['type'];
    };
  }>('/offline-qr/list', async (request, reply) => {
    const { type } = request.query;

    let qrList = Array.from(offlineQRs.values());

    if (type) {
      qrList = qrList.filter((qr) => qr.type === type);
    }

    return {
      qrs: qrList.map((qr) => ({
        id: qr.id,
        name: qr.name,
        type: qr.type,
        createdAt: qr.createdAt,
        downloadUrl: qr.downloadUrl,
      })),
      total: qrList.length,
    };
  });

  // 10. Get offline QR by ID
  fastify.get<{
    Params: { id: string };
  }>('/offline-qr/:id', async (request, reply) => {
    const { id } = request.params;
    const qr = offlineQRs.get(id);

    if (!qr) {
      return reply.status(404).send({
        error: 'Offline QR code not found',
        id,
      });
    }

    // Regenerate QR code
    const qrCode = await QRCode.toDataURL(qr.qrDataString, {
      errorCorrectionLevel: 'H',
      width: 512,
    });

    return {
      ...qr,
      qrCode,
    };
  });

  // 11. Delete offline QR
  fastify.delete<{
    Params: { id: string };
  }>('/offline-qr/:id', async (request, reply) => {
    const { id } = request.params;
    const existed = offlineQRs.delete(id);

    if (!existed) {
      return reply.status(404).send({
        error: 'Offline QR code not found',
      });
    }

    return {
      message: 'Offline QR code deleted successfully',
      id,
    };
  });

  // 12. Get supported offline QR types
  fastify.get('/offline-qr/types', async (request, reply) => {
    return {
      types: [
        {
          type: 'wifi',
          name: 'WiFi Network',
          description: 'Share WiFi credentials for automatic connection',
          useCases: ['Guest WiFi', 'Office network', 'Events'],
        },
        {
          type: 'vcard',
          name: 'Contact Card',
          description: 'Share contact information (vCard format)',
          useCases: ['Business cards', 'Networking', 'Contact sharing'],
        },
        {
          type: 'event',
          name: 'Calendar Event',
          description: 'Add events to calendar automatically',
          useCases: ['Meeting invites', 'Conference schedules', 'Reminders'],
        },
        {
          type: 'sms',
          name: 'SMS Message',
          description: 'Send pre-filled SMS messages',
          useCases: ['Quick replies', 'Customer service', 'Feedback'],
        },
        {
          type: 'email',
          name: 'Email',
          description: 'Compose email with pre-filled fields',
          useCases: ['Contact forms', 'Support requests', 'Inquiries'],
        },
        {
          type: 'phone',
          name: 'Phone Call',
          description: 'Initiate phone calls directly',
          useCases: ['Customer support', 'Quick dial', 'Emergency contacts'],
        },
        {
          type: 'text',
          name: 'Plain Text',
          description: 'Display any text content',
          useCases: ['Serial numbers', 'Codes', 'Instructions'],
        },
        {
          type: 'location',
          name: 'GPS Location',
          description: 'Share geographic coordinates',
          useCases: ['Store locations', 'Meeting points', 'Delivery addresses'],
        },
      ],
    };
  });
}
