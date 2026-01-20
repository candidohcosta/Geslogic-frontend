// frontend/src/pages/PublicEventFeedbackPage.tsx
import React, { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { submitPublicFeedback } from '../services/api'; // Ou cria função específica
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Textarea } from '../components/ui/Textarea';
import { Star } from 'lucide-react';

const PublicEventFeedbackPage: React.FC = () => {
  const { registrationId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: (data: any) => submitPublicFeedback(registrationId!, token!, data),
    onSuccess: () => setSubmitted(true),
    onError: (err: any) => alert(err.message)
  });

  const handleSubmit = () => {
    if (rating === 0) return alert("Por favor selecione uma classificação.");
    mutation.mutate({ rating, comment });
  };

  if (!token) return <div className="p-8 text-center text-red-500">Link inválido.</div>;

  if (submitted) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md text-center p-8">
                <div className="mx-auto bg-green-100 w-16 h-16 rounded-full flex items-center justify-center text-green-600 mb-4">
                    <Star className="w-8 h-8 fill-current" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Obrigado!</h2>
                <p className="text-gray-600 mt-2">A sua opinião ajuda-nos a melhorar os próximos eventos.</p>
            </Card>
        </div>
      );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
            <CardTitle>Avaliação do Evento</CardTitle>
            <p className="text-sm text-gray-500">Como classificaria a sua experiência?</p>
        </CardHeader>
        <CardContent className="space-y-6">
            
            {/* ESTRELAS */}
            <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="transition-transform hover:scale-110 focus:outline-none"
                    >
                        <Star 
                            className={`w-10 h-10 ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                        />
                    </button>
                ))}
            </div>
            
            <div className="space-y-2">
                <label className="text-sm font-medium">Comentários (Opcional)</label>
                <Textarea 
                    placeholder="O que gostou mais? O que podemos melhorar?" 
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                />
            </div>

            <Button className="w-full" onClick={handleSubmit} disabled={mutation.isPending}>
                {mutation.isPending ? 'A enviar...' : 'Enviar Avaliação'}
            </Button>

        </CardContent>
      </Card>
    </div>
  );
};

export default PublicEventFeedbackPage;