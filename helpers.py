import os
import json
import database as db


def load_all_definitions(file_path):
    """Load a JSON file with error handling."""
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def send_email(to_addr: str, subject: str, body: str) -> None:
    """Send an email using SMTP credentials stored in the database."""
    conf = db.get_email_config()
    smtp_host = conf.get('host') or os.getenv('SMTP_HOST')
    smtp_port = int(conf.get('port') or os.getenv('SMTP_PORT') or 587)
    smtp_user = conf.get('username') or os.getenv('SMTP_USER')
    smtp_pass = conf.get('password') or os.getenv('SMTP_PASSWORD')
    from_addr = smtp_user or 'no-reply@towerchronicles.xyz'
    try:
        if smtp_host:
            import smtplib
            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.starttls()
                if smtp_user and smtp_pass:
                    server.login(smtp_user, smtp_pass)
                msg = f"From: {from_addr}\r\nTo: {to_addr}\r\nSubject: {subject}\r\n\r\n{body}"
                server.sendmail(from_addr, [to_addr], msg)
    except Exception as e:
        print(f"Failed to send email: {e}")
    finally:
        with open('sent_emails.log', 'a', encoding='utf-8') as f:
            f.write(f"TO: {to_addr}\nSUBJECT: {subject}\n{body}\n---\n")
