import { useState } from "react";

function useForm(initialValues) {
  const [values, setValues] = useState(initialValues);

  // Update form fields automatically
  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setValues((previousValues) => ({
      ...previousValues,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Reset all form fields
  const resetForm = () => {
    setValues(initialValues);
  };

  // Update multiple form values
  const setFormValues = (newValues) => {
    setValues(newValues);
  };

  return {
    values,
    handleChange,
    resetForm,
    setFormValues,
  };
}

export default useForm;