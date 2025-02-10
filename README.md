```markdown
# Train Booking API

A simple train booking API built with Node.js, Express, and PostgreSQL.

## Setup & Installation

1. **Clone the repository**  
   ```bash
   git clone https://github.com/deceasedone/workindia-api-task.git
   cd your-repo
   ```

2. **Install dependencies**  
   ```bash
   npm install
   ```

3. **Create a `.env` file** with the following variables:  
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/mydatabase
   JWT_SECRET=your_jwt_secret
   ADMIN_API_KEY=your_admin_api_key
   PORT=3000
   ```

4. **Setup the database**  
   - Create a PostgreSQL database.
   - Run the SQL schema.

## Running the Server

Start the server with:  
```bash
node server.js
```
or  
```bash
npm start
```

## API Endpoints

- **Register:** `POST /api/register`  
- **Login:** `POST /api/login`  
- **Add Train (Admin):** `POST /api/trains` *(Requires `x-api-key` in headers)*  
- **Check Availability:** `GET /api/trains/availability?source=1&destination=2`  
- **Book a Seat:** `POST /api/bookings` *(Requires JWT Token)*  
- **Get Booking Details:** `GET /api/bookings/:id` *(Requires JWT Token)*  

## Testing (Optional)

Run tests :  
```bash
Testing with Postman

    Register a user (POST /api/register)

{ "name": "123", "email": "123@gmail.com", "password": "password" }

Login & Get Token (POST /api/login)

{ "email": "123@gmail.com", "password": "password" }

Response: { "token": "your_jwt_token" }

Add a Train (Admin Only) (POST /api/trains)

    Header: x-api-key: your_admin_key
    Body:

    { "name": "Express", "source_station_id": 1, "destination_station_id": 2, "total_seats": 100 }

Check Seat Availability (GET /api/trains/availability?source=1&destination=2)

Book a Seat (User Only) (POST /api/bookings)

    Header: Authorization: Bearer your_jwt_token
    Body: { "train_id": 1 }

Get Booking Details (GET /api/bookings/{booking_id})

```
Tech Stack Used:
- **Backend:** Node.js, Express.js  
- **Database:** PostgreSQL  
- **Authentication:** JWT (JSON Web Tokens)  
- **Security:** API Key authentication for admin actions  
- **Environment Variables:** dotenv 
