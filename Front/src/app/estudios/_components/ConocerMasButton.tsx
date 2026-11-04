'use client';

import { useId, useState } from 'react';
import Image from 'next/image';
import Carousel from 'react-bootstrap/Carousel';
import Modal from 'react-bootstrap/Modal';
import type { Plan } from '@/types/plan';
import CheckoutButton from './CheckoutButton';
import styles from './landing.module.css';

interface PlanBenefit {
  title: string;
  description: string;
  keyBenefit: string;
}

interface ConocerMasPlan extends Plan {
  benefits: PlanBenefit[];
  image: string;
}

interface ConocerMasButtonProps {
  plan: ConocerMasPlan;
}

export default function ConocerMasButton({ plan }: ConocerMasButtonProps) {
  const [show, setShow] = useState(false);
  const [activeBenefit, setActiveBenefit] = useState(0);
  const titleId = useId();

  function closeModal() {
    setShow(false);
    setActiveBenefit(0);
  }

  return (
    <>
      <button
        type="button"
        className={`btn btn-outline-dark ${styles.planButton}`}
        aria-label={`Conocer más sobre el plan ${plan.name}`}
        onClick={() => setShow(true)}
      >
        Conocer más <span aria-hidden="true">↗</span>
      </button>

      <Modal
        show={show}
        onHide={closeModal}
        centered
        scrollable
        size="lg"
        dialogClassName={styles.planModalDialog}
        contentClassName={styles.planModal}
        aria-labelledby={titleId}
      >
        <Modal.Header closeButton closeLabel="Cerrar" className={styles.planModalHeader}>
          <div>
            <p className={styles.planModalEyebrow}>Conocé todo lo que incluye</p>
            <Modal.Title id={titleId} as="h2">
              Plan {plan.name}
            </Modal.Title>
          </div>
        </Modal.Header>

        <Modal.Body className={styles.planModalBody}>
          <div className="row g-4 ">
            <div className="col-12 col-md-7">
              <p className={styles.planModalPrice}>Precio: ${plan.price}</p>
              <Carousel
                activeIndex={activeBenefit}
                onSelect={(index) => {
                  if (typeof index === 'number') setActiveBenefit(index);
                }}
                className={styles.planCarousel}
                prevLabel="Beneficio anterior"
                nextLabel="Beneficio siguiente"
              >
                {plan.benefits.map((benefit, index) => (
                  <Carousel.Item key={benefit.title}>
                    <div className={styles.planBenefit}>
                      <p className={styles.planBenefitCount}>
                        Beneficio {index + 1} de {plan.benefits.length}
                      </p>
                      <h3>{benefit.title}</h3>
                      <p className={styles.planBenefitDescription}>{benefit.description}</p>
                      <p className={styles.planBenefitHighlight}>
                        <strong>Lo más importante:</strong> {benefit.keyBenefit}
                      </p>
                    </div>
                  </Carousel.Item>
                ))}
              </Carousel>
            </div>

            <div className="col-12 col-md-5">
              <div className={styles.planModalImage}>
                <Image
                  src={plan.image}
                  alt={`Ilustración del ${plan.name}`}
                  fill
                  sizes="(max-width: 767px) 100vw, 40vw"
                  quality={90}
                />
              </div>
            </div>
          </div>
        </Modal.Body>

        <Modal.Footer className={styles.planModalFooter}>
          <CheckoutButton plan={plan} />
        </Modal.Footer>
      </Modal>
    </>
  );
}
