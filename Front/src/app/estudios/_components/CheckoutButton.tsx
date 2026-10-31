"use client";
import styles from './landing.module.css';
import {Plan} from '@/types/plan';

interface CheckoutButtonProps {
  plan: Plan;
}

const CheckoutButton = ({ plan }: CheckoutButtonProps) => {

    const handlePayment = async (plan: Plan) => {
    // solicitud fetch de tipo POST con body para conectar con la pasarela de pago
    
    try {
            const res = await fetch("********Endpoint de la peticion******",{ 
            method: "POST",
            body: JSON.stringify(plan),
            headers: {
              "Content-Type": "application/json"
            }})

            const buyer= await res.json();
              window.location.href = buyer.init_point;
      
    } catch (error: any) {
      
          console.error("Error creating checkout session:", error);
          throw new Error("Ocurrió un error al procesar el pago. Por favor, inténtalo de nuevo.");
    }
    
  }

  return (
    <button
        type="button"
        className={`btn btn-outline-dark ${styles.planButton}`}
        aria-label={`Conocer más sobre el plan ${plan.name}`}
        onClick={() => handlePayment(plan)}
        >
        Conocer más <span aria-hidden="true">↗</span>
    </button>
    );
}

    export default CheckoutButton;