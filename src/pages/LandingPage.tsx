// frontend/src/pages/LandingPage.tsx

import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/Card'; // Usaremos Cards para outras secções
import { CalendarDays, ClipboardList, Mail } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchPubliclyListedEvents } from '../services/api';

const LandingPage: React.FC = () => {

  const { data: featuredEvents = [], isLoading } = useQuery({
    queryKey: ['featuredEvents'],
    queryFn: fetchPubliclyListedEvents,
  });

  return (
    <div className="flex-grow flex flex-col">
      {/* --- SECÇÃO HERO --- */}
      <section className="w-full py-16 md:py-20 lg:py-24 bg-gray-100 dark:bg-gray-800">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <div className="max-w-3xl mx-auto space-y-4">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl text-gray-900 dark:text-gray-50">
              A Sua Plataforma Completa para Gestão de Eventos
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 md:text-xl">
              Desde a criação de formulários personalizados até à comunicação com os participantes, tudo num único local. Simplifique a sua organização e foque-se no que realmente importa.
            </p>
          </div>
          <div className="mt-8 flex justify-center gap-4">
            <Button asChild size="lg">
              <Link to="/register">Começar Agora (Grátis)</Link>
            </Button>
            <Button variant="outline" asChild size="lg">
              <Link to="/#features">Saber Mais</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* --- PRÓXIMAS SECÇÕES (ainda por construir) --- */}
      <section id="features" className="w-full py-12 md:py-24">
        <div className="container mx-auto">
          {/*  DENTRO DA <section id="features"> */}

          <h2 className="text-3xl font-bold text-center mb-12">Funcionalidades Principais</h2>

          {/* A Grelha de Funcionalidades */}
          <div className="container mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4 md:px-6">
            
            {/* Cartão 1: Gestão de Eventos */}
            <div className="flex flex-col items-center text-center space-y-2 p-4">
              <div className="p-3 rounded-full bg-primary/10 text-primary">
                <CalendarDays className="h-8 w-8" /> {/* Ícone */}
              </div>
              <h3 className="text-xl font-bold">Gestão Centralizada</h3>
              <p className="text-muted-foreground">
                Crie e gira todos os seus eventos a partir de um único dashboard intuitivo.
              </p>
            </div>

            {/* Cartão 2: Formulários Personalizados */}
            <div className="flex flex-col items-center text-center space-y-2 p-4">
              <div className="p-3 rounded-full bg-primary/10 text-primary">
                <ClipboardList className="h-8 w-8" /> {/* Ícone */}
              </div>
              <h3 className="text-xl font-bold">Formulários Dinâmicos</h3>
              <p className="text-muted-foreground">
                Construa formulários de inscrição personalizados para cada evento com o nosso editor drag-and-drop.
              </p>
            </div>

            {/* Cartão 3: Comunicação Integrada */}
            <div className="flex flex-col items-center text-center space-y-2 p-4">
              <div className="p-3 rounded-full bg-primary/10 text-primary">
                <Mail className="h-8 w-8" /> {/* Ícone */}
              </div>
              <h3 className="text-xl font-bold">Comunicação Integrada</h3>
              <p className="text-muted-foreground">
                Envie emails personalizados, gira templates e audite todas as comunicações com os participantes.
              </p>
            </div>

            {/* Podes adicionar mais cartões aqui, a grelha adapta-se automaticamente */}
          </div>
        </div>
      </section>
      
      {/* ... (outras secções como "Eventos em Destaque", etc.) ... */}
      {/* +++ A NOSSA NOVA SECÇÃO +++ */}
<section id="featured-events" className="w-full py-12 md:py-24 bg-gray-50">
  <div className="container mx-auto px-4 md:px-6">
    <h2 className="text-3xl font-bold text-center mb-12">Eventos em Destaque</h2>
    
    {isLoading ? ( <p className="text-center">A carregar eventos...</p> ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {featuredEvents.map((event: any) => (
          <Link key={event.id} to={`/events/${event.id}`} className="group block">
            <Card className="overflow-hidden transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1">
              <div className="relative">
                {/* Imagem de Fundo */}
                <img
                  src={event.bannerImageUrl || 'https://placehold.co/600x400/e2e8f0/e2e8f0'}
                  alt={event.name}
                  className="aspect-[16/9] w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {/* Sobreposição Escura */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                {/* Título e Empresa (Sobrepostos) */}
                <div className="absolute bottom-0 left-0 p-4">
                  <h3 className="text-lg font-bold text-white">{event.name}</h3>
                  <p className="text-sm text-gray-200">{event.company.name}</p>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span>{new Date(event.startDate).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                  <span>{event.location}</span>
                </div>

                {/* O botão "Ver Detalhes" foi removido. O cartão inteiro é o link. */}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    )}
  </div>
</section>   
    </div>
  );
};

export default LandingPage;
