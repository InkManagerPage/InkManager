"use client";

import { useState } from 'react';
import Modal from 'react-bootstrap/Modal';
import { Formik, Field, Form, ErrorMessage } from 'formik';
import { registerFields } from './registerFields';
import { registerService } from '../../../services/users.service';
import { toast } from 'react-toastify';

// Función para obtener la descripción según el paso y el rol
const getStepTitle = (currentStep, isStudio) => {
  switch (currentStep) {
    case 1:
      return "Datos Personales";
    case 2:
      return isStudio ? "Datos del Estudio" : "Información Personal";
    case 3:
      return "Ubicación";
    case 4:
      return isStudio ? "Portfolio del estudio" : "Portfolio y Perfil";
    case 5:
      return "Precios y Cobros";
    case 6:
      return "Verificación y Documentos";
    default:
      return "";
  }
};

export function RegisterModal({ show, onHide }) {
  const [step, setStep] = useState(1);

  const initialValues = registerFields.reduce((acc, field) => {
    acc[field.name] = field.initialValues;
    return acc;
  }, {});

  const handleRegisterSubmit = async (formData, {setSubmitting, resetForm}) => {
    try {
      const { error } = await registerService(formData);

      if(error){
        toast.error(error)
      } else {
        toast.success("¡Usuario registrado con éxito!");
        resetForm();
        setStep(1);
        onHide();
      }
    }catch{
      toast.error("Ocurrió un error inesperado.")
    } finally{
      setSubmitting(false)
    }
  };

  //Función para que se cierra la ventanita del formulario
  const handleCloseModal = () => {
    onHide();
    setStep(1);
  };

  return (
    <Modal show={show} onHide={handleCloseModal} centered data-bs-theme="dark" size="lg">
      <Formik
        initialValues={initialValues}
        onSubmit={handleRegisterSubmit}
      >
        {({ values, handleSubmit, isSubmitting }) => {
          
          const isClient = values.roles === "CLIENT";
          const isArtist = values.roles === "ARTIST";
          const isStudio = values.roles === "STUDIO";

          // Aca se obtienen los campos base de la etapa actual
          const getFieldsForCurrentStep = () => {
            switch (step) {
              case 1:
                return registerFields.filter(f => ["email", "password", "name", "roles"].includes(f.name));
              case 2:
                return registerFields.filter(f => ["artistName", "alias", "phone", "nDni"].includes(f.name));
              case 3:
                return registerFields.filter(f => ["workType", "adress", "city", "country", "availabilityHours"].includes(f.name));
              case 4:
                return registerFields.filter(f => ["mainStyles", "instagram", "tiktok", "yearsOfExperience", "gallery"].includes(f.name));
              case 5:
                return registerFields.filter(f => ["minimumRate", "paymentMethod", "requiresDeposit", "depositAmountOrPercentage", "cancellationPolicy", "acceptedPaymentMethods", "bankAccountAlias"].includes(f.name));
              case 6:
                return registerFields.filter(f => [
                  "licenseNumber", "healthLicenseUrl", "identityDocumentUrl", "profilePhoto", 
                  "workingPhoto", "acceptsHygieneDeclaration", "acceptsCoverUps", "acceptsScarWork", 
                  "acceptsTouchUps", "acceptsFaceAndHandTattoos", "copiesInternetDesigns", "minimumSizeCm"
                ].includes(f.name));
              default:
                return [];
            }
          };

          let currentFields = getFieldsForCurrentStep();

          // Si es un estudio muestro ciertos campos
          if (isStudio) {
            currentFields = currentFields.map(field => {
              if (field.name === "artistName") {
                return { ...field, label: "Nombre del Estudio" };
              }
              return field;
            });

            currentFields = currentFields.filter(field => field.name !== "workType");
            currentFields = currentFields.filter(field => field.name !== "yearsOfExperience");
          }

          // Lógica para avanzar de paso o enviar según el rol
          const handleNext = (e) => {
            e.preventDefault();
            
            if (step === 1) {
              if (isClient) {
                handleSubmit(); 
              } else {
                setStep(2);     
              }
            } else if (step === 2 || step === 3) {
              setStep(step + 1);  
            } else if (step === 4) {
              if (isStudio) {
                handleSubmit(); 
              } else {
                setStep(5);     
              }
            } else if (step === 5) {
              setStep(6);         
            } else if (step === 6) {
              handleSubmit();     
            }
          };

          const handlePrev = (e) => {
            e.preventDefault();
            if (step > 1) setStep(step - 1);
          };

          return (
            <Form className="d-flex flex-column">
              <Modal.Header closeButton className="border-0 bg-zinc-900 text-white">
                <Modal.Title className="fw-bold">
                  Crear una cuenta ({getStepTitle(step, isStudio)})
                </Modal.Title>
              </Modal.Header>
              
              <Modal.Body className="bg-zinc-900 text-white p-4">
                <div className="d-flex flex-column gap-3">
                  {currentFields.map((field) => (
                    <div key={field.name} className="mb-2">
                      <label htmlFor={field.name} className="form-label text-light fw-medium small">
                        {field.label}:
                      </label>
                      
                      {field.type === "select" ? (
                        <Field as="select" name={field.name} className="form-select bg-dark text-light border-secondary">
                          <option value="" disabled>Seleccione una opción</option>
                          {field.options?.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </Field>
                      ) : field.type === "checkbox" ? (
                        <div className="form-check">
                          <Field type="checkbox" name={field.name} className="form-check-input bg-dark border-secondary" id={field.name}/>
                          <label className="form-check-label text-light small" htmlFor={field.name}>
                            {field.label}
                          </label>
                        </div>
                      ) : (
                        <Field type={field.type} name={field.name} min={field.min} className="form-control bg-dark text-light border-secondary"/>
                      )}
                      
                      <ErrorMessage name={field.name} component="div" className="text-danger small mt-1"/>
                    </div>
                  ))}

                  {/* Botones de Navegación */}
                  <div className={`d-flex ${step > 1 ? 'justify-content-between' : 'justify-content-end'} align-items-center mt-4 pt-3 border-top border-secondary`}>
                    {step > 1 && (
                      <button 
                        type="button" 
                        onClick={handlePrev} 
                        className="btn btn-link text-light text-decoration-none px-3 py-2 fw-medium opacity-75"
                      >
                        Anterior
                      </button>
                    )}
                    {(() => {
                      const isRegisterAction = (isClient && step === 1) || (isStudio && step === 4) || (isArtist && step === 6);

                      return (
                        <button 
                          type="button" 
                          onClick={handleNext} 
                          className={`btn px-4 py-2 rounded-pill ${
                            isRegisterAction 
                              ? "btn-light text-dark" 
                              : "btn btn-link text-light text-decoration-none px-3 py-2 fw-medium opacity-75"
                          }`}
                          disabled={isSubmitting}
                        >
                          {isRegisterAction ? "Registrarse" : "Siguiente"}
                        </button>
                      );
                    })()}
                  </div>
                </div>
              </Modal.Body>
            </Form>
          );
        }}
      </Formik>
    </Modal>
  );
}