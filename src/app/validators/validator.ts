// src/validators/validator.ts
import { AbstractControl, AsyncValidatorFn, ValidationErrors, ValidatorFn } from '@angular/forms';
import { debounce, debounceTime, map, Observable, of } from 'rxjs';

export function passwordValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.value;

    if (!password) {
      return null; // Return null if the control has no value (no error).
    }

    // Check for at least 8 characters
    const minLength = /.{8,}/.test(password);

    // Check for at least one uppercase letter
    const hasUppercase = /[A-Z]/.test(password);

    // Check for at least one number or special character
    const hasNumberOrSpecialChar = /[0-9!@#$%^&*(),.?":{}|<>]/.test(password);

    // If all criteria are met, return null (no error)
    const isValid = minLength && hasUppercase && hasNumberOrSpecialChar;

    return isValid ? null : { passwordInvalid: true };
  };
}

export function customEmailValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const email = control.value;

    if (!email) {
      return null; // Return null if the control has no value (no error).
    }

    // Custom email regex: allows domains with at least two characters after a dot
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const isValid = emailRegex.test(email);

    return isValid ? null : { emailInvalid: true };
  };
}

export function matchPasswords(password: string, confirmPassword: string): ValidatorFn {
  return (formGroup: AbstractControl): ValidationErrors | null => {
    const passwordControl = formGroup.get(password);
    const confirmPasswordControl = formGroup.get(confirmPassword);

    if (!passwordControl || !confirmPasswordControl) {
      return null; // No error if controls aren't found
    }

    // Check if the passwords match
    if (passwordControl.value !== confirmPasswordControl.value) {
      confirmPasswordControl.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      confirmPasswordControl.setErrors(null); // Clear any previous errors if they match
    }

    return null;
  };
}

export function addressValidator(): ValidatorFn {
  return (formGroup: AbstractControl): ValidationErrors | null => {
    const addressControl = formGroup.get('address');
    const cityControl = formGroup.get('city');
    const stateControl = formGroup.get('state');
    const zipControl = formGroup.get('zip');

    const fields = [
      { value: addressControl?.value?.trim(), control: addressControl },
      { value: cityControl?.value?.trim(), control: cityControl },
      { value: stateControl?.value?.trim(), control: stateControl },
      { value: zipControl?.value?.trim(), control: zipControl },
    ];

    // Check if any field has a value
    const anyFieldHasValue = fields.some(({ value }) => value);

    // If any field has a value, all must have values
    let hasError = false;
    if (anyFieldHasValue) {
      fields.forEach(({ value, control }) => {
        if (!value) {
          control?.setErrors({ fieldRequired: true }); // Mark as invalid
          hasError = true;
        } else if (control?.hasError('fieldRequired')) {
          control.setErrors(null); // Clear errors if value is now valid
        }
      });
    } else {
      // If no fields have values, clear all errors
      fields.forEach(({ control }) => control?.setErrors(null));
    }

    return hasError ? { addressInvalid: true } : null;
  };
}

export function phoneValidator(): ValidatorFn {
  const phonePattern = /^\(\d{3}\)-\d{3}-\d{4}$/;
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    // Check if value matches the pattern
    const isValid = phonePattern.test(value);

    return isValid ? null : { phoneInvalid: true };
  };
}

export function asyncPhoneValidator(): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    return of(control.value).pipe(
      debounceTime(300),
      map(value => {
        console.log('Phone input value:', value);
        const phonePattern = /^\(\d{3}\)-\d{3}-\d{4}$/;
        return value && !phonePattern.test(value)
          ? { invalidPhone: true }
          : null;
      })
    );
  };
}

export function zipCodeValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value?.trim(); // Ensure the value is trimmed
    const zipCodePattern = /^\d{5}$/;

    // If the value is empty, it's valid
    if (!value) {
      return null;
    }

    // If the value does not match the pattern, return an error
    if (!zipCodePattern.test(value)) {
      return { invalidZipCode: true };
    }

    // Otherwise, it's valid
    return null;
  };
}

export function numericValidator(): ValidatorFn {
  return (control: AbstractControl): { [key: string]: any } | null => {
    const isValid = /^[0-9]*$/.test(control.value);
    return isValid ? null : { numeric: true };
  };
}

export function asyncNumericValidator(): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    return of(control.value).pipe(
      debounceTime(300),
      map(value => {
        const isValid = /^[0-9]*$/.test(value);
        return isValid ? null : { numeric: true };
      })
    );
  };
}

export function asyncDateValidator(): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    return of(control.value).pipe(
      debounceTime(300),
      map(value => {
        if (!value) return null;

        // Check format MM/DD/YYYY
        const dateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/;
        if (!dateRegex.test(value)) {
          return { invalidDateFormat: true };
        }

        // Validate date existence
        const [month, day, year] = value.split('/').map(Number);
        const date = new Date(year, month - 1, day);
        
        if (
          date.getFullYear() !== year ||
          date.getMonth() !== month - 1 ||
          date.getDate() !== day
        ) {
          return { invalidDate: true };
        }

        return null;
      })
    );
  };
}

export function asyncDecimalValidator(label: string | null = null): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    return of(control.value).pipe(
      debounceTime(300),
      map(value => {
        if (!value) return null;
        console.log('Value is ->' + value + '<-');
        // If label is " ft", final regex is:  ^\d+(?:\.\d*)? ft$
        // That means: at least one digit, optionally a decimal point
        // and zero or more digits, then a space+label, end of string.
        const decimalRegex = label
          ? new RegExp(`^\\d+(?:\\.\\d*)?${label}$`)
          : /^\d+(?:\.\d*)?$/;

        if (!decimalRegex.test(value)) {
          return { invalidDecimal: true };
        }

        // Also ensure only one decimal point:
        if ((value.match(/\./g) || []).length > 1) {
          return { multipleDecimals: true };
        }

        return null;
      })
    );
  };

}

export function DecimalValidator(label: string | null = null): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) return null;
    console.log('Value is ->' + value + '<-');
    // If label is " ft", final regex is:  ^\d+(?:\.\d*)? ft$
    // That means: at least one digit, optionally a decimal point
    // and zero or more digits, then a space+label, end of string.
    const decimalRegex = label
      ? new RegExp(`^\\d+(?:\\.\\d*)?${label}$`)
      : /^\d+(?:\.\d*)?$/;

    if (!decimalRegex.test(value)) {
      return { invalidDecimal: true };
    }

    // Also ensure only one decimal point:
    if ((value.match(/\./g) || []).length > 1) {
      return { multipleDecimals: true };
    }

    return null;
  };
}

// Validator to check if prize total equals 100 (for percentage mode)
export function prizeTotalEquals100Validator(): ValidatorFn {
  return (formGroup: AbstractControl): ValidationErrors | null => {
    const firstPrize = formGroup.get('firstPrize');
    const secondPrize = formGroup.get('secondPrize');
    const thirdPrize = formGroup.get('thirdPrize');

    if (!firstPrize || !secondPrize || !thirdPrize) {
      return null; // No error if controls aren't found
    }

    // Only validate if all fields have values
    if (!firstPrize.value && !secondPrize.value && !thirdPrize.value) {
      return null;
    }

    const first = parseFloat(firstPrize.value) || 0;
    const second = parseFloat(secondPrize.value) || 0;
    const third = parseFloat(thirdPrize.value) || 0;
    const total = first + second + third;

    // Check if total equals 100
    if (total !== 100) {
      return { prizeTotalNot100: { total } };
    }

    return null;
  };
}

// Validator to check if individual prize is less than 600 (for dollar mode)
export function maxPrizeAmountValidator(max: number = 600): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (!value) {
      return null; // No error if empty
    }

    const amount = parseFloat(value);

    if (isNaN(amount)) {
      return null; // Let other validators handle non-numeric values
    }

    if (amount > max) {
      return { maxPrizeExceeded: { max, actual: amount } };
    }

    return null;
  };
}
