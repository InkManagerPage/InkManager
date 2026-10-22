import { Formik, Field, Form, ErrorMessage } from "formik";

export const FormikForm = ({ fields, handleSubmit, buttonText, buttonStyles }) => {
    const mapInitialValues = fields.map((field) => ({ [field.name]: field.initialValues }));
    const initialValues = Object.assign({}, ...mapInitialValues);
    
    return (
        <Formik initialValues={initialValues} onSubmit={handleSubmit}>
            <Form className="d-flex flex-column gap-3">
                {fields.map((field) => (
                    <div key={field.name} className="mb-2">
                        <label htmlFor={field.name} className="form-label text-light fw-medium small">
                            {field.label}:
                        </label>
                        
                        {field.type === "select" ? (
                            <Field 
                                as="select" 
                                name={field.name} 
                                validate={field.validate}
                                className="form-select bg-dark text-light border-secondary"
                            >
                                <option value="" disabled>Seleccione una opción</option>
                                {field.options?.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </Field>
                        ) : (
                            <Field 
                                type={field.type} 
                                name={field.name} 
                                validate={field.validate} 
                                min={field.min} 
                                className="form-control bg-dark text-light border-secondary" 
                            />
                        )}
                        
                        <ErrorMessage 
                            name={field.name} 
                            component="div" 
                            className="text-danger small mt-1" 
                        />
                    </div>
                ))}

                <button type="submit" className="btn btn-primary w-100 mt-3 py-2" style={buttonStyles} >
                    {buttonText}
                </button>
            </Form>
        </Formik>
    );
};