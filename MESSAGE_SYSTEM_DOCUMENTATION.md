# VHR Dashboard - Message System Documentation

**Updated:** December 16, 2025  
**Status:** FULLY OPERATIONAL

---

## Overview

The VHR Dashboard now has a complete message system with:
- ✓ Contact form for visitor messages
- ✓ Admin dashboard for managing messages  
- ✓ Email notifications to admin when messages arrive
- ✓ Admin ability to reply to messages via email
- ✓ Complete timestamps tracking (received, read, replied)

---

## Features

### 1. Contact Form (Public)
- Visitors submit messages with name, email, subject, and message
- Messages are stored in PostgreSQL database
- Admin receives email notification immediately
- Messages marked as 'unread' by default

### 2. Message Management (Admin Dashboard)
- View all messages
- Filter by read/unread status
- Mark messages as read
- Send replies to message senders
- Delete messages
- See timestamps for when messages were sent and replied

### 3. Email Notifications
- **Contact Submission:** Admin gets email notification with full message
- **Reply Notification:** Contact sender gets email with the reply + original message for context

### 4. Timestamp Tracking
Messages track the following dates:
- `createdAt` - When the message was received
- `readAt` - When admin marked it as read
- `respondedAt` - When admin sent a reply
- `respondedBy` - Which admin user replied

---

## Database Schema

```sql
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  name TEXT,                              -- Sender's name
  email TEXT,                             -- Sender's email
  subject TEXT,                           -- Message subject
  message TEXT,                           -- Message body
  status TEXT DEFAULT 'unread',           -- unread, read, or replied
  createdat TIMESTAMPTZ DEFAULT NOW(),    -- When message was received
  updatedat TIMESTAMPTZ DEFAULT NOW(),    -- Last update time
  readat TIMESTAMPTZ,                     -- When admin marked as read
  respondedat TIMESTAMPTZ,                -- When admin replied
  response TEXT,                          -- Admin's reply text
  respondedby TEXT                        -- Admin username who replied
)
```

---

## API Endpoints

### Submit Contact Message (Public)
```http
POST /api/contact

Content-Type: application/json
{
  "name": "John Doe",
  "email": "john@example.com",
  "subject": "Help needed",
  "message": "I need assistance with..."
}

Response: {
  "ok": true,
  "message": "Message received. We'll respond soon."
}
```

### Get All Messages (Admin)
```http
GET /api/admin/messages
Authorization: Bearer <JWT_TOKEN>

Response: {
  "ok": true,
  "messages": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "subject": "Help needed",
      "message": "I need assistance with...",
      "status": "unread",
      "createdat": "2025-12-16T16:23:23.572Z",
      "respondedAt": "2025-12-16T16:23:24.304Z",
      "response": "Thank you for your message...",
      "respondedby": "vhr"
    }
  ]
}
```

### Get Unread Messages Only (Admin)
```http
GET /api/admin/messages/unread
Authorization: Bearer <JWT_TOKEN>
```

### Reply to Message (Admin)
```http
PATCH /api/admin/messages/:id
Authorization: Bearer <JWT_TOKEN>

Content-Type: application/json
{
  "status": "read",
  "response": "Thank you for your message. Here is our response..."
}

Response: {
  "ok": true,
  "message": "Message updated",
  "emailSent": true
}
```

### Delete Message (Admin)
```http
DELETE /api/admin/messages/:id
Authorization: Bearer <JWT_TOKEN>

Response: {
  "ok": true,
  "message": "Message deleted"
}
```

---

## How It Works

### Workflow 1: Receiving a Message

1. **Visitor submits contact form**
   - Form sends POST to `/api/contact`
   - Message stored in PostgreSQL with `createdAt` timestamp
   - Message marked as `status: unread`

2. **Admin email notification**
   - Admin receives email with:
     - Sender's name and email
     - Subject and message content
     - Date the message was received
   - Email allows reply-to sender's email address

### Workflow 2: Replying to a Message

1. **Admin opens dashboard**
   - Views message in admin panel
   - Reads the sender's message with timestamp

2. **Admin composes reply**
   - Types response in dashboard
   - Sends reply via PATCH `/api/admin/messages/:id`

3. **System sends reply**
   - Email is sent to the **original sender**
   - Email includes:
     - Admin's reply text
     - Reply timestamp
     - Sender's original message for context
     - Sender's original message date
   - Message marked as `status: read`
   - Message gets `respondedAt` timestamp
   - Message records `respondedby` (admin username)

4. **Message updated in database**
   - Status: `unread` → `read`
   - `readAt` timestamp is set
   - `response` field contains the reply
   - `respondedAt` contains the reply timestamp
   - `respondedby` contains the admin's username

---

## Email Templates

### Admin Notification (Contact Received)
```
Subject: 📩 [VHR Contact] {Subject}

From: {Name} <{Email}>
Received: {Date}

Message:
{Full message content}
```

### Sender Notification (Reply Sent)
```
Subject: Réponse: {Original Subject}

Hello,

We have received and read your message. Here is our response:

---
{Admin Reply}
---

Your original message was:
Subject: {Subject}
Sent: {Original Date}

Message: {Original message content}

---
Please use the contact form to send follow-up messages.
```

---

## Testing the System

### Quick Test
```powershell
& ".\test-message-system.ps1"
```

This script:
1. Sends a test contact message
2. Logs in as admin
3. Retrieves all messages
4. Sends a reply email
5. Verifies all timestamps are recorded

### Expected Output
```
[STEP 1] Sending test contact message...
  [OK] Message sent successfully

[STEP 2] Logging in as admin...
  [OK] Admin logged in successfully

[STEP 3] Retrieving all messages...
  [OK] Retrieved X messages
  Latest: test@example.local

[STEP 4] Sending reply...
  [OK] Reply sent successfully
  Email sent: True

[STEP 5] Verifying message with timestamps...
  [OK] Message found
  Date Received: 2025-12-16T16:23:23.572Z
  Date Replied: 2025-12-16T16:23:24.304Z
  Replied By: vhr
```

---

## Configuration

### Email Settings
Set in `.env`:
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

If `EMAIL_USER` or `EMAIL_PASS` are not configured:
- Messages still sent/stored in database
- Email notifications won't be sent
- Dashboard shows warning in logs

### Database
PostgreSQL is used automatically if `DATABASE_URL` is set.
Fallback to JSON file (messages.json) in development mode.

---

## Troubleshooting

### Problem: Messages sent but no email received

**Solution:**
1. Check `.env` has `EMAIL_USER` and `EMAIL_PASS`
2. Verify email configuration is correct
3. Check Brevo/Gmail SMTP settings
4. Look for errors in server logs: `[email] ...`

Example log error:
```
[email] ✗ Failed to send contact message
[email] Error: Invalid login (SMTP authentication failed)
```

### Problem: No database timestamp tracking

**Ensure PostgreSQL columns exist:**
- `createdAt` (default: CURRENT_TIMESTAMP)
- `readAt` (nullable)
- `respondedAt` (nullable)
- `respondedby` (nullable)
- `response` (nullable)

### Problem: Admin reply not sent to sender

**Check:**
1. Message has valid `email` field
2. Email configuration is set
3. Server logs show `[email] ✓ Reply sent successfully`
4. Sender's email isn't filtered by spam

---

## Database Query Examples

### Get all unread messages
```sql
SELECT * FROM messages WHERE status = 'unread' ORDER BY createdat DESC;
```

### Get messages with replies
```sql
SELECT * FROM messages WHERE respondedat IS NOT NULL ORDER BY respondedat DESC;
```

### Get reply statistics
```sql
SELECT 
  COUNT(*) as total_messages,
  COUNT(*) FILTER (WHERE status = 'unread') as unread_count,
  COUNT(*) FILTER (WHERE respondedat IS NOT NULL) as replied_count
FROM messages;
```

### Get response time (how long until reply)
```sql
SELECT 
  id,
  email,
  EXTRACT(EPOCH FROM (respondedat - createdat)) / 60 as response_time_minutes
FROM messages
WHERE respondedat IS NOT NULL
ORDER BY response_time_minutes DESC;
```

---

## Recent Updates

### December 16, 2025
- ✓ Added `sendReplyToContact()` function to send emails to message senders
- ✓ Updated `/api/admin/messages/:id` PATCH endpoint to send replies
- ✓ Added timestamp tracking: `createdAt`, `readAt`, `respondedAt`
- ✓ Added admin username tracking (`respondedby`)
- ✓ Created test script `test-message-system.ps1`
- ✓ HTML email templates with professional formatting

---

## Next Steps (Optional Enhancements)

1. **Message Search** - Search messages by email, subject, or content
2. **Message Filters** - Advanced filtering by date range, status, etc.
3. **Message Export** - Export messages to CSV
4. **Attachments** - Allow file uploads with messages
5. **Auto-Replies** - Set up auto-reply templates
6. **Bulk Actions** - Delete/archive multiple messages at once
7. **Rate Limiting** - Limit message submissions per IP/email
8. **Spam Detection** - Automatic spam filtering
9. **Message Categories** - Tag messages with categories
10. **Response SLA Tracking** - Monitor average response times

---

**System Status:** ✓ ALL OPERATIONAL

The message system is now fully functional with:
- Contact form submissions
- Admin notifications  
- Message management
- Email replies to senders
- Complete timestamp tracking

Users will receive a reply email when the admin responds, including the original message for context.
