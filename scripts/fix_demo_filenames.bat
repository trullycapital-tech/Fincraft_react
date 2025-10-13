@echo off
REM This script copies/renames demo PDF files to match the expected filenames for the backend demo endpoints.
cd /d "%~dp0backend\uploads\documents"

REM HDFC
copy /Y HDFC_Statement_Oct2024.pdf HDFC_Bank_statement_of_account.pdf
copy /Y HDFC_RepaymentSchedule.pdf HDFC_Bank_repayment_schedule.pdf

REM ICICI
copy /Y ICICI_Statement_Oct2024.pdf ICICI_Bank_statement_of_account.pdf
copy /Y ICICI_RepaymentSchedule.pdf ICICI_Bank_repayment_schedule.pdf

REM AXIS
copy /Y AXIS_Bank_statement_of_account.pdf AXIS_Bank_statement_of_account.pdf
copy /Y AXIS_Bank_repayment_schedule.pdf AXIS_Bank_repayment_schedule.pdf
copy /Y AXIS_Bank_foreclosure_letter.pdf AXIS_Bank_foreclosure_letter.pdf
copy /Y AXIS_Bank_sanction_letter.pdf AXIS_Bank_sanction_letter.pdf

REM KOTAK
copy /Y KOTAK_Bank_statement_of_account.pdf KOTAK_Bank_statement_of_account.pdf
copy /Y KOTAK_Bank_repayment_schedule.pdf KOTAK_Bank_repayment_schedule.pdf
copy /Y KOTAK_Bank_foreclosure_letter.pdf KOTAK_Bank_foreclosure_letter.pdf
copy /Y KOTAK_Bank_sanction_letter.pdf KOTAK_Bank_sanction_letter.pdf

REM YES
copy /Y YES_Bank_statement_of_account.pdf YES_Bank_statement_of_account.pdf
copy /Y YES_Bank_repayment_schedule.pdf YES_Bank_repayment_schedule.pdf
copy /Y YES_Bank_foreclosure_letter.pdf YES_Bank_foreclosure_letter.pdf
copy /Y YES_Bank_sanction_letter.pdf YES_Bank_sanction_letter.pdf

echo All demo files copied/renamed as needed.
pause
