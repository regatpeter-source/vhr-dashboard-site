# Test Credentials

## Admin Account
- **Username**: `vhr`
- **Password**: `vhr123`
- **Role**: `admin`
- **Access**: Full admin dashboard at `/admin-dashboard.html`

## User Account (VHR Demo)
- **Username**: `VhrDashboard`
- **Password**: `VhrDashboard@2025`
- **Role**: `user`
- **Email**: `regatpeter@hotmail.fr`
- **Benefits**: 7-day free trial + demo access

## Scripts

### Reset Admin Password
```bash
node reset-admin.js
```
This script resets the admin account password to `vhr123`.

### Reset VhrDashboard User Password
```bash
node add-user.js
```
This script resets the VhrDashboard user password to `VhrDashboard@2025`.

### Test Passwords
```bash
node test-admin-pwd.js
node test-password.js
```
These scripts verify password hashes work correctly with bcrypt.

## API Login Test

```bash
# Admin login
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"vhr","password":"vhr123"}'

# User login
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"VhrDashboard","password":"VhrDashboard@2025"}'
```

## Notes

- Passwords are hashed with bcrypt (10 rounds)
- User data is stored in `data/users.json` (ignored in git)
- Both accounts must exist in `data/users.json` for login to work
- The server reloads users from file on each login attempt (`reloadUsers()` function)
