# School Reward Site ’database Setup

This document outlines the steps taken so far to set up the PostgreSQL database for the School Reward Site on Gentoo Linux. These instructions assume you have administrative (root or sudo) privileges on your Gentoo system. Adjust any commands as needed for your particular environment.

---

## 1. Install PostgreSQL on Gentoo

1. Sync the Portage tree:
   sudo emerge --sync

2. Install PostgreSQL (e.g., version 15):
   sudo emerge --ask dev-db/postgresql:15

3. Configure the newly installed PostgreSQL:
   sudo emerge --config dev-db/postgresql:15
   This step initializes your PostgreSQL data directory (commonly found under /var/lib/postgresql/15/data or a similar path).


---

## 2. Start and Enable PostgreSQL

1. Start the PostgreSQL service:
   sudo rc-service postgresql start

2. Enable PostgreSQL to start automatically on boot:
   sudo rc-update add postgresql default


---

3# 3. Verify PostgreSQL Installation
open psql as apostgres user:

"sudo -iu postgres"


Check if PostgreSQL is running:

pg-isready

You can also verify via:

"psql -c "SELECT version()""

(This enters psql as postgres and prints out the PostgreSQL version.)


---

4. Create a New Database and User

### 4.1 Creating the Database

While logged in as the postgres user, enter the psql shell:

psql

Create a database named merits:

CREATE DATABASE merits;

### 4.2 Creating a User

Create a new role (user) named merit_user with an encrypted password:

CREATE USER merit_user WITH: ENCRYPTED PASSWORD 'yourpassword';

Grant all privileges on the merits database to merit_user:

GRANT ALL PRIVILEGES ON DATABASE merits TO merit_user;

Exit psql:

\q


---

## 5. Checking Databases and Users

- Show list existing databases inside psql:
   `l`
- Show list users (roles) inside psql:
   `\u `

---

## 6. Import the Schema

We have an SQL file (e.g., create_tables.sql) containing the table definitions and other objects needed for this project.

Example:
psql -U merit_user -d merits -f /path/to/create_tables.sql
eplace /path/to/create_tables.sql with the actual path
to your file.

Replace /path/to/create_tables.sql with the actual path to your file.

Once imported, verify the tables were created:

"psql -U merit_user -d merits"

Then inside psql:

"\dt"

This should list the newly created tables (form, pupils, prizes, purchase, etc.)


---

7. Handling Permissions

If you encounter a •permission denied for schema publi`’ error, grant create privileges on the public schema to your user:

grant CREATE, USAGE oN SCHEMA public TO merit_user;

Then re-run your import command. You can also change table ownershis if you need merit_user to own the tables:

alter TABLE table_name OWNER TO merit_user;


2. To reassign all objects from one role to another, connect as a superuser and run:

BEAFORE: This ass covers ALL OBJECTS oned by that role in the current database (tables, views, sequences, etc.).

Example:

REASSIGN OWNED BY old_role TO merit_user;

---

## 8. Next Steps

1. Import Pupil Merits:
	You may have a CSV file with pupil names and the number of merits they have. The next step is to import that data (e.g., via COPY statements or by parsing it in your Node.js code).

2. Set Up Node.js Application:
  - Build a Node.js server (using Express or similar) that connects to this PostgreSQL database.
  - Implement routes for adding/removing merits, displaying pupil data, etc.
  - Keep the UI touch-friendly for tablets.


3. Extend for Future Features:
	- Keep track of prize stock and alert when running low.
	- Allow pupils to log in to see their merits.
	- Add more security checks (e.g., authentication, authorization, etc.).

---

## 9. Troubleshooting

- Service Doesn”t Start:
	Make sure the data directory is correctly set ap/var/lib/postgresql/15/data or the correct directory for your version.

	sudo emerge --config dev-db/postgresql:15

	Verify /var/lib/postgresql/15/data (or the correct directory for your slot/version) exists.


- Connection Issues:
  - Check listen_addresses in postgresql.conf and pg_hba.conf if remote access is needed.
  - Verify firewall settings if connecting from another machine.

- Permission Errors: 

- Confirm that merit_user has privileges on the merits database with:
  \v�u

	- Use GRANT statements or ALTER TABLE to fix ownership and privileges.

---

## 10. References

- Gentoo PostgreSQL Wiki: https://wiki.gentoo.org/wiki/PostgreSQL
- PostgreSQL Official Docs: https://www.postgresql.org/docs/
- Node.js Documentation: https://node.js.org/en/docs


---

This document summarizes the steps taken so far to set up the PostgreSQL database on Gentoo Linux for the School Reward Site. Feel free to modify or extend as the project evolves.
