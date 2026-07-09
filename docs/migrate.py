#!/usr/bin/env python3
import os
import re
import sys

# Paths
SQL_DUMP_PATH = "/Users/brummbitio/Documents/Kuliah/peer-conselour-web/wp_dzj2w(4).sql"
OUTPUT_SQL_PATH = "/Users/brummbitio/Documents/Kuliah/peer-conselour-web/docs/import-data.sql"

# Mapping Lookups
FAKULTAS_LOOKUP = {
    "1": "Fakultas Hukum",
    "2": "Fakultas Ekonomi dan Bisnis",
    "3": "Fakultas Ilmu Administrasi",
    "4": "Fakultas Pertanian",
    "5": "Fakultas Peternakan",
    "6": "Fakultas Teknik",
    "7": "Fakultas Kedokteran",
    "8": "Fakultas Perikanan dan Ilmu Kelautan",
    "9": "Fakultas Matematika dan Ilmu Pengetahuan Alam",
    "10": "Fakultas Teknologi Pertanian",
    "11": "Fakultas Ilmu Sosial dan Ilmu Politik",
    "12": "Fakultas Ilmu Budaya",
    "13": "Fakultas Kedokteran Hewan",
    "14": "Fakultas Ilmu Komputer",
    "15": "Fakultas Kedokteran Gigi",
    "16": "Fakultas Vokasi",
    "17": "Program Pascasarjana",
    "20": "Fakultas Ilmu Kesehatan",
}

TOPIC_LOOKUP = {
    "12": "Konseling Mahasiswa",
    "13": "Rujukan Dosen",
    "14": "Rujukan BK Fakultas",
    "15": "Konseling Masalah Pribadi",
    "16": "Konseling Masalah Akademik",
    "17": "Konseling Masalah Sosial",
    "18": "Konseling Masalah Keluarga",
    "19": "Konseling Masalah Karier",
    "20": "Konseling Masalah Perundungan",
    "21": "Konseling PPKS",
}

def parse_mysql_values_block(block_text):
    """
    Parses a MySQL bulk insert values block like:
    (1, 'val', NULL), (2, 'val\'s with comma, inside', 3)
    Returns a list of tuples representing rows.
    Uses a character-by-character scanner to safely handle quotes, escaped quotes, and parentheses.
    """
    rows = []
    current_row = []
    current_val = []
    
    in_string = False
    string_char = None
    escaped = False
    in_tuple = False
    
    i = 0
    length = len(block_text)
    
    while i < length:
        char = block_text[i]
        
        if escaped:
            current_val.append(char)
            escaped = False
            i += 1
            continue
            
        if char == '\\':
            # Lookahead to see if it's an escape character
            escaped = True
            i += 1
            continue
            
        if in_string:
            if char == string_char:
                in_string = False
                string_char = None
            else:
                current_val.append(char)
        else:
            if char in ("'", '"'):
                in_string = True
                string_char = char
            elif char == '(':
                if not in_tuple:
                    in_tuple = True
                    current_row = []
                    current_val = []
                else:
                    current_val.append(char)
            elif char == ')':
                if in_tuple:
                    # Save last value
                    val_str = "".join(current_val).strip()
                    if val_str.upper() == 'NULL':
                        current_row.append(None)
                    else:
                        current_row.append(val_str)
                    rows.append(current_row)
                    in_tuple = False
                else:
                    # Closing bracket outside tuple (should not happen)
                    pass
            elif char == ',':
                if in_tuple:
                    val_str = "".join(current_val).strip()
                    if val_str.upper() == 'NULL':
                        current_row.append(None)
                    else:
                        current_row.append(val_str)
                    current_val = []
            elif char.isspace():
                # Skip whitespace outside strings
                pass
            else:
                current_val.append(char)
        i += 1
        
    return rows

def parse_sql_dump(file_path):
    """
    Reads the massive SQL dump file line-by-line.
    Extracts the insert statements for each target table.
    Converts blocks to row tuples.
    """
    tables_data = {
        'ost_user': [],
        'ost_user_email': [],
        'ost_user__cdata': [],
        'ost_ticket': [],
        'ost_ticket__cdata': [],
        'ost_thread': [],
        'ost_thread_entry': [],
        'ost_staff': [],
    }
    
    current_table = None
    current_block = []
    
    print(f"Membaca file SQL dump: {file_path}...")
    
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            # Check for start of INSERT
            match = re.match(r"^INSERT INTO `(ost_[^`]+)` .*VALUES", line, re.IGNORECASE)
            if match:
                if current_table and current_block:
                    # Parse previous table's finished block
                    block_text = "".join(current_block)
                    tables_data[current_table].extend(parse_mysql_values_block(block_text))
                    current_block = []
                
                table_name = match.group(1)
                if table_name in tables_data:
                    current_table = table_name
                    # Extract the values block starting after VALUES
                    values_start = line.upper().find("VALUES") + 6
                    current_block.append(line[values_start:])
                else:
                    current_table = None
            elif current_table:
                # Append to current block until semicolon is reached
                current_block.append(line)
                if line.rstrip().endswith(";"):
                    # Block finished
                    block_text = "".join(current_block)
                    # Strip trailing semicolon
                    if block_text.rstrip().endswith(";"):
                        block_text = block_text.rstrip()[:-1]
                    tables_data[current_table].extend(parse_mysql_values_block(block_text))
                    current_table = None
                    current_block = []
                    
    # Handle any remaining block
    if current_table and current_block:
        block_text = "".join(current_block)
        if block_text.rstrip().endswith(";"):
            block_text = block_text.rstrip()[:-1]
        tables_data[current_table].extend(parse_mysql_values_block(block_text))
        
    for k, v in tables_data.items():
        print(f"Berhasil mengekstrak {len(v)} baris dari tabel {k}")
        
    return tables_data

def escape_pg_string(val):
    """
    Escapes a string for PostgreSQL:
    - Replaces single quotes with double single quotes ('' -> standard SQL)
    - If val is None, returns 'NULL' (as a raw keyword, not string)
    """
    if val is None:
        return "NULL"
    # Convert string representation of numbers or clean text
    val_str = str(val)
    # Escape single quote
    val_escaped = val_str.replace("'", "''")
    return f"'{val_escaped}'"

def run_migration():
    data = parse_sql_dump(SQL_DUMP_PATH)
    
    # 1. Map Staff (Admins/Counselors)
    # ost_staff: [staff_id, dept_id, role_id, username, firstname, lastname, passwd, backend, email, phone, ...]
    staff_by_id = {}
    admins_out = []
    
    for row in data['ost_staff']:
        if len(row) < 9:
            continue
        staff_id = int(row[0])
        username = row[3]
        firstname = row[4] or ""
        lastname = row[5] or ""
        full_name = f"{firstname} {lastname}".strip() or username
        email = row[8] or f"{username}@student.ub.ac.id"
        phone = row[9] or ""
        is_admin = int(row[18]) if row[18] is not None else 0
        
        role = "admin"
        if is_admin == 1 or username in ('admin', 'mauritssitinjak', 'hanselsamosir', 'razzanazizi'):
            role = "superadmin"
            
        staff_by_id[staff_id] = {
            'id': staff_id,
            'email': email,
            'full_name': full_name,
            'role': role,
            'phone': phone,
        }
        
    # 2. Map Users (Students)
    # ost_user: [id, org_id, default_email_id, status, name, created, updated]
    users_basic = {}
    for row in data['ost_user']:
        user_id = int(row[0]) + 100000
        name = row[4]
        created = row[5]
        users_basic[user_id] = {
            'id': user_id,
            'name': name,
            'created': created
        }
        
    # ost_user_email: [id, user_id, flags, address]
    user_emails = {}
    for row in data['ost_user_email']:
        user_id = int(row[1]) + 100000
        email = row[3]
        user_emails[user_id] = email
        
    # ost_user__cdata: [user_id, NIM, name, fakultas, jurusan, jenis_kelamin, phone, jenis, notes]
    users_cdata = {}
    for row in data['ost_user__cdata']:
        user_id = int(row[0]) + 100000
        nim = row[1]
        cdata_name = row[2]
        fakultas_id = row[3]
        jurusan = row[4]
        gender_code = row[5]
        phone = row[6]
        
        # Translate Fakultas
        fakultas = FAKULTAS_LOOKUP.get(str(fakultas_id), None) if fakultas_id else None
        
        # Translate Gender
        gender = None
        if gender_code == 'L':
            gender = "Laki-laki"
        elif gender_code == 'P':
            gender = "Perempuan"
            
        users_cdata[user_id] = {
            'nim': nim,
            'cdata_name': cdata_name,
            'fakultas': fakultas,
            'jurusan': jurusan,
            'gender': gender,
            'phone': phone
        }
        
    # Build Consolidated Students List
    students_by_id = {}
    for user_id, basic in users_basic.items():
        email = user_emails.get(user_id, f"migrated_user_{user_id}@student.ub.ac.id")
        cdata = users_cdata.get(user_id, {})
        
        nim = cdata.get('nim', None)
        full_name = cdata.get('cdata_name') or basic['name']
        gender = cdata.get('gender', None)
        faculty = cdata.get('fakultas', None)
        department = cdata.get('jurusan', None)
        phone = cdata.get('phone', None)
        
        # Clean NIM if it is empty or string 'NULL'
        if nim == 'NULL' or not nim:
            nim = None
            
        students_by_id[user_id] = {
            'id': user_id,
            'nim': nim,
            'email': email,
            'full_name': full_name,
            'role': 'student',
            'gender': gender,
            'faculty': faculty,
            'department': department,
            'phone': phone,
            'created_at': basic['created']
        }
        
    # 2.5 Deduplicate & Merge Accounts by Email & NIM using Union-Find (Resolves transitive duplicates)
    parent = {}
    
    def find_parent(i):
        path = []
        while parent[i] != i:
            path.append(i)
            i = parent[i]
        for node in path:
            parent[node] = i
        return i

    def union_nodes(i, j):
        root_i = find_parent(i)
        root_j = find_parent(j)
        if root_i != root_j:
            is_staff_i = root_i in staff_by_id
            is_staff_j = root_j in staff_by_id
            
            if is_staff_j and not is_staff_i:
                parent[root_i] = root_j
            elif is_staff_i and not is_staff_j:
                parent[root_j] = root_i
            else:
                if root_i < root_j:
                    parent[root_j] = root_i
                else:
                    parent[root_i] = root_j

    # Initialize all nodes
    for s_id in staff_by_id:
        parent[s_id] = s_id
    for u_id in students_by_id:
        parent[u_id] = u_id

    email_to_ids = {}
    nim_to_ids = {}

    # Register staff values
    for s_id, s in staff_by_id.items():
        email = str(s['email']).lower().strip()
        email_to_ids.setdefault(email, []).append(s_id)
        if s.get('nim'):
            nim = str(s['nim']).strip()
            nim_to_ids.setdefault(nim, []).append(s_id)

    # Register student values
    for u_id, s in students_by_id.items():
        email = str(s['email']).lower().strip()
        email_to_ids.setdefault(email, []).append(u_id)
        if s.get('nim'):
            nim = str(s['nim']).strip()
            nim_to_ids.setdefault(nim, []).append(u_id)

    # Perform Union on duplicates
    for ids in email_to_ids.values():
        for other_id in ids[1:]:
            union_nodes(ids[0], other_id)

    for ids in nim_to_ids.values():
        for other_id in ids[1:]:
            union_nodes(ids[0], other_id)

    # Build final mapping maps
    student_id_to_final_user_id = { u_id: find_parent(u_id) for u_id in students_by_id }
    
    merged_student_ids = set()
    for u_id in students_by_id:
        final_id = student_id_to_final_user_id[u_id]
        if final_id != u_id or final_id in staff_by_id:
            merged_student_ids.add(u_id)

    # Merge student metadata into resolved staff profiles
    for u_id, s in students_by_id.items():
        final_id = student_id_to_final_user_id[u_id]
        if final_id in staff_by_id and final_id != u_id:
            staff = staff_by_id[final_id]
            if not staff.get('nim') and s['nim']:
                staff['nim'] = s['nim']
            if not staff.get('gender') and s['gender']:
                staff['gender'] = s['gender']
            if not staff.get('faculty') and s['faculty']:
                staff['faculty'] = s['faculty']
            if not staff.get('department') and s['department']:
                staff['department'] = s['department']
            if not staff.get('phone') and s['phone']:
                staff['phone'] = s['phone']
        
    # 3. Map Tickets
    # ost_ticket: [ticket_id, ticket_pid, number, user_id, user_email_id, status_id, dept_id, topic_id, staff_id, ...]
    # ost_ticket__cdata: [ticket_id, tahapKonseling, subject, priority, StatusMahasiswa]
    ticket_cdata = {}
    for row in data['ost_ticket__cdata']:
        ticket_id = int(row[0])
        tahap_id = row[1]
        subject = row[2]
        priority_id = row[3]
        
        tahap = None
        if tahap_id == '1':
            tahap = "Pertama"
        elif tahap_id == '2':
            tahap = "Lanjutan"
            
        ticket_cdata[ticket_id] = {
            'tahap': tahap,
            'subject': subject
        }
        
    tickets_list = []
    for row in data['ost_ticket']:
        if len(row) < 9:
            continue
        ticket_id = int(row[0])
        number = row[2]
        raw_student_id = int(row[3]) + 100000
        # Use merged student ID
        student_id = student_id_to_final_user_id.get(raw_student_id, raw_student_id)
        status_id = str(row[5])
        topic_id = str(row[8])
        counselor_id = int(row[9]) if row[9] else None
        created = row[25]
        updated = row[26]
        
        # Resolve status
        # 1 = open, 2 = resolved, 3 = closed (resolved)
        status = 'open'
        if status_id in ('2', '3'):
            status = 'resolved'
            
        # Resolve Category/Topic
        category = TOPIC_LOOKUP.get(topic_id, "Lainnya")
        
        cdata = ticket_cdata.get(ticket_id, {})
        title = cdata.get('subject') or f"Sesi Konseling #{number}"
        tahap = cdata.get('tahap', None)
        
        # If counselor_id is not in staff, make it null
        if counselor_id and counselor_id not in staff_by_id:
            counselor_id = None
            
        # If student_id is not in users, skip or keep null?
        if student_id not in students_by_id and student_id not in staff_by_id:
            # Create a mock student to preserve foreign key
            students_by_id[student_id] = {
                'id': student_id,
                'nim': None,
                'email': f"migrated_orphan_{student_id}@student.ub.ac.id",
                'full_name': f"User Migrasi {student_id}",
                'role': 'student',
                'gender': None,
                'faculty': None,
                'department': None,
                'phone': None,
                'created_at': created
            }
            # Make sure we map this newly created mock student to itself
            student_id_to_final_user_id[student_id] = student_id
            
        tickets_list.append({
            'id': ticket_id,
            'code': number,
            'student_id': student_id,
            'counselor_id': counselor_id,
            'title': title,
            'category': category,
            'status': status,
            'tahap_konseling': tahap,
            'created_at': created,
            'updated_at': updated,
        })
        
    # 4. Map Thread & Messages
    # ost_thread: [id, object_id, object_type, ...] -> object_id is ticket_id when object_type = 'T'
    thread_to_ticket = {}
    for row in data['ost_thread']:
        thread_id = int(row[0])
        object_id = int(row[1])
        object_type = row[2]
        if object_type == 'T':
            thread_to_ticket[thread_id] = object_id
            
    # ost_thread_entry: [id, pid, thread_id, staff_id, user_id, type, flags, poster, ..., body, format, ..., created, updated]
    messages_list = []
    for row in data['ost_thread_entry']:
        if len(row) < 13:
            continue
        entry_id = int(row[0])
        thread_id = int(row[2])
        staff_id = int(row[3])
        user_id = int(row[4]) + 100000 if int(row[4]) > 0 else 0
        msg_type = row[5] # 'M' = Message (student), 'R' = Response (staff)
        poster = row[7]
        body = row[12]
        created = row[17]
        
        # Link to ticket
        ticket_id = thread_to_ticket.get(thread_id)
        if not ticket_id:
            continue # message not belonging to a ticket
            
        # Determine sender_id and role
        sender_id = 0
        sender_role = 'mahasiswa'
        if msg_type == 'R':
            sender_role = 'admin'
            sender_id = staff_id if staff_id in staff_by_id else 1 # fallback to admin id 1
        else:
            sender_role = 'mahasiswa'
            matching_tkt = next((t for t in tickets_list if t['id'] == ticket_id), None)
            tkt_student_id = matching_tkt['student_id'] if matching_tkt else 0
            raw_sender_id = user_id if (user_id and user_id in students_by_id) else tkt_student_id
            sender_id = student_id_to_final_user_id.get(raw_sender_id, raw_sender_id)
            
        # Verify sender_id exists in our users table (staff or student)
        # If it doesn't, we map it to the ticket's owner or counselor
        if sender_role == 'admin':
            if sender_id not in staff_by_id:
                sender_id = 1 # default admin
        else:
            if sender_id not in students_by_id and sender_id not in staff_by_id:
                # Try to fallback to ticket's student
                matching_tkt = next((t for t in tickets_list if t['id'] == ticket_id), None)
                sender_id = matching_tkt['student_id'] if matching_tkt else (user_id if user_id > 0 else 100001)
                if sender_id not in students_by_id and sender_id not in staff_by_id:
                    continue # Skip orphaned message if we can't map user
                    
        messages_list.append({
            'id': entry_id,
            'ticket_id': ticket_id,
            'sender_id': sender_id,
            'sender_role': sender_role,
            'sender_name': poster,
            'body': body,
            'created_at': created
        })
        
    # Write to target PostgreSQL SQL file
    print(f"Menulis file SQL target ke: {OUTPUT_SQL_PATH}...")
    with open(OUTPUT_SQL_PATH, 'w', encoding='utf-8') as f:
        f.write("-- ========================================================\n")
        f.write("-- DATA IMPORT HASIL MIGRASI OSTICKET -> POSTGRESQL\n")
        f.write("-- Generated automatically by migrate.py\n")
        f.write("-- ========================================================\n\n")
        
        f.write("BEGIN;\n\n")
        
        # Disable constraints temporarily to make sure imports go smoothly
        f.write("SET CONSTRAINTS ALL DEFERRED;\n\n")
        
        # 1. Insert Admins & Staff
        f.write("-- INSERT ADMIN & STAFF\n")
        for s_id, s in staff_by_id.items():
            password_hash = "$2a$10$UB2026DemoPasswordPlaceholderHash12345" # Placeholder password
            f.write(
                f"INSERT INTO users (id, nim, email, password_hash, full_name, role, gender, faculty, department, phone, created_at, updated_at) "
                f"VALUES ({s['id']}, {escape_pg_string(s.get('nim'))}, {escape_pg_string(s['email'])}, '{password_hash}', {escape_pg_string(s['full_name'])}, "
                f"'{s['role']}', {escape_pg_string(s.get('gender'))}, {escape_pg_string(s.get('faculty'))}, {escape_pg_string(s.get('department'))}, {escape_pg_string(s['phone'])}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) "
                f"ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;\n"
            )
        f.write("\n")
        
        # 2. Insert Students
        f.write("-- INSERT STUDENTS\n")
        for u_id, s in students_by_id.items():
            # Skip if merged with an admin or another student
            if u_id in merged_student_ids:
                continue
            password_hash = "$2a$10$UB2026DemoPasswordPlaceholderHash12345"
            f.write(
                f"INSERT INTO users (id, nim, email, password_hash, full_name, role, gender, faculty, department, phone, created_at, updated_at) "
                f"VALUES ({s['id']}, {escape_pg_string(s['nim'])}, {escape_pg_string(s['email'])}, '{password_hash}', {escape_pg_string(s['full_name'])}, "
                f"'student', {escape_pg_string(s['gender'])}, {escape_pg_string(s['faculty'])}, {escape_pg_string(s['department'])}, "
                f"{escape_pg_string(s['phone'])}, {escape_pg_string(s['created_at'])}, {escape_pg_string(s['created_at'])}) "
                f"ON CONFLICT (id) DO NOTHING;\n"
            )
        f.write("\n")
        
        # 3. Insert Tickets
        f.write("-- INSERT TICKETS\n")
        for t in tickets_list:
            counselor_val = str(t['counselor_id']) if t['counselor_id'] else "NULL"
            tahap_val = escape_pg_string(t['tahap_konseling'])
            f.write(
                f"INSERT INTO tickets (id, code, student_id, counselor_id, title, category, status, tahap_konseling, summary, created_at, updated_at, closed_at) "
                f"VALUES ({t['id']}, {escape_pg_string(t['code'])}, {t['student_id']}, {counselor_val}, {escape_pg_string(t['title'])}, "
                f"{escape_pg_string(t['category'])}, '{t['status']}', {tahap_val}, NULL, {escape_pg_string(t['created_at'])}, "
                f"{escape_pg_string(t['updated_at'])}, NULL);\n"
            )
        f.write("\n")
        
        # 4. Insert Messages
        f.write("-- INSERT TICKET MESSAGES\n")
        for m in messages_list:
            f.write(
                f"INSERT INTO ticket_messages (id, ticket_id, sender_id, sender_role, sender_name, body, created_at) "
                f"VALUES ({m['id']}, {m['ticket_id']}, {m['sender_id']}, '{m['sender_role']}', {escape_pg_string(m['sender_name'])}, "
                f"{escape_pg_string(m['body'])}, {escape_pg_string(m['created_at'])});\n"
            )
        f.write("\n")
        
        # Reset serial sequences in PostgreSQL so new inserts don't collide
        f.write("-- RESET SEQUENCES\n")
        f.write("SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE(MAX(id), 1)) FROM users;\n")
        f.write("SELECT setval(pg_get_serial_sequence('tickets', 'id'), COALESCE(MAX(id), 1)) FROM tickets;\n")
        f.write("SELECT setval(pg_get_serial_sequence('ticket_messages', 'id'), COALESCE(MAX(id), 1)) FROM ticket_messages;\n\n")
        
        f.write("COMMIT;\n")
        
    print(f"Selesai! File SQL target berhasil ditulis dengan: ")
    print(f"- {len(staff_by_id)} Staff")
    print(f"- {len(students_by_id) - len(merged_student_ids)} Students (Deduplicated)")
    print(f"- {len(tickets_list)} Tickets")
    print(f"- {len(messages_list)} Messages")

if __name__ == "__main__":
    run_migration()
