// src/pages/PublicCompanyPage.tsx

import React from 'react';
import { useParams, Link, useNavigate, useLocation  } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPublicCompanyProfile, fetchMyFavoriteCompanies, addFavoriteCompany, removeFavoriteCompany } from '../services/api';
import { Helmet } from 'react-helmet-async';
import { ImageSlideshow } from '../components/ui/ImageSlideshow';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Star } from 'lucide-react';

// Definir os tipos de dados que esperamos receber da API
interface PublicEventListItemDto {
  id: string;
  name: string;
  startDate: Date;
  location: string;
}
interface PublicCompanyProfileDto {
  id: string;
  name: string;
  slug: string;
  aboutUsHtml?: string | null; // <-- Adicionar este campo
  logo?: { url: string } | null;
  slideshowImages: { // <-- A NOSSA NOVA PROPRIEDADE
    id: string;
    url: string;
    displayName: string;
  }[];
  events: PublicEventListItemDto[];
}

const PublicCompanyPage: React.FC = () => {
  const params = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { companySlug: slugFromSubdomain } = useCompany();
  const { user, isAuthenticated } = useAuth();

  const slug = slugFromSubdomain || params.slug;

  const { data: companyProfile, isLoading, error } = useQuery<PublicCompanyProfileDto, Error>({
    queryKey: ['publicCompany', slug],
    queryFn: () => fetchPublicCompanyProfile(slug!),
    enabled: !!slug,
  });

    // NOVA QUERY: para saber se esta empresa já é uma favorita
  const { data: favoriteCompanies = [] } = useQuery({
    queryKey: ['myFavoriteCompanies'],
    queryFn: fetchMyFavoriteCompanies,
    enabled: isAuthenticated && user?.role === 'PARTICIPANT', // Só busca se for um participante logado
  });
  
  const isFavorite = favoriteCompanies.some((fav: any) => fav.company.id === companyProfile?.id);

  // MUTAÇÕES para adicionar/remover dos favoritos
  const addFavoriteMutation = useMutation({
    mutationFn: addFavoriteCompany,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['myFavoriteCompanies'] }); },
  });
  const removeFavoriteMutation = useMutation({
    mutationFn: removeFavoriteCompany,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['myFavoriteCompanies'] }); },
  });

  const handleFavoriteClick = () => {
    // Se não estiver autenticado...
    if (!isAuthenticated) {
      // 1. Constrói o caminho para onde queremos que ele volte
      const redirectTo = location.pathname; // ex: '/companies/empresa-a'
      
      // 2. Redireciona para o login com a informação extra
      navigate(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
      return;
    }
    if (!companyProfile) return;

    if (isFavorite) {
      removeFavoriteMutation.mutate(companyProfile.id);
    } else {
      addFavoriteMutation.mutate(companyProfile.id);
    }
  };

  if (isLoading) {
    return <div className="p-6 text-center">A carregar perfil da empresa...</div>;
  }

  if (error) {
    return <div className="p-6 text-center text-red-500">Erro: {error.message}</div>;
  }

  return (
    <>
      <Helmet>
        <title>{isLoading ? 'A carregar empresa...' : (companyProfile?.name || 'Empresa não encontrada')} | GesLogic Registo</title>
        {/* Usamos uma descrição genérica ou podemos adicionar um campo 'description' à entidade Company no futuro */}
        <meta name="description" content={`Veja os próximos eventos organizados por ${companyProfile?.name}.`} />

        {/* Open Graph / Facebook */}
        <meta property="og:title" content={companyProfile?.name} />
        <meta property="og:description" content={`Veja os próximos eventos organizados por ${companyProfile?.name}.`} />
        {/* Para a imagem, podemos usar um logótipo da empresa, se o adicionarmos no futuro */}
        {/* <meta property="og:image" content={companyProfile.logoUrl} /> */}
        <meta property="og:url" content={window.location.href} />
        <meta property="og:type" content="website" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={companyProfile?.name} />
        <meta name="twitter:description" content={`Veja os próximos eventos organizados por ${companyProfile?.name}.`} />
        {/* <meta name="twitter:image" content={companyProfile.logoUrl} /> */}
      </Helmet>
    <div className="flex-grow">
      {/* --- CABEÇALHO DA PÁGINA DA EMPRESA --- */}
      <header className="py-8 bg-gray-50 text-center">
        {companyProfile?.logo ? (
          <img src={companyProfile.logo.url} alt={`Logótipo de ${companyProfile.name}`} className="mx-auto h-24 w-auto mb-4"/>
        ) : (
          <h1 className="text-4xl font-bold">{companyProfile?.name}</h1>
        )}
        {/* O NOSSO NOVO BOTÃO DE FAVORITOS */}
        {user?.role === 'PARTICIPANT' && (
          <Button
            variant={isFavorite ? "default" : "outline"}
            onClick={handleFavoriteClick}
            className="absolute top-4 right-4"
            disabled={addFavoriteMutation.isPending || removeFavoriteMutation.isPending}
          >
            <Star className={`mr-2 h-4 w-4 ${isFavorite ? 'fill-yellow-300 text-yellow-500' : ''}`} />
            {isFavorite ? 'A Seguir' : 'Seguir Empresa'}
          </Button>
        )}        
      </header>


      {/* --- O NOSSO NOVO CONTENTOR PRINCIPAL DE DUAS COLUNAS --- */}
      <div className="container mx-auto p-4 md:p-8">
        {/* Usamos 'grid' para criar o layout. Em mobile (por defeito), é 1 coluna.
            Em tablets e acima (md:), passa a 2 colunas. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          
          {/* Coluna da Esquerda: Sobre Nós */}
          <div id="about-us">
            {companyProfile?.aboutUsHtml && (
              <Card>
                <CardHeader>
                  <CardTitle>Sobre Nós</CardTitle>
                </CardHeader>
                <CardContent>
                  <div 
                    className="prose max-w-none" // 'prose' estiliza o HTML do editor
                    dangerouslySetInnerHTML={{ __html: companyProfile.aboutUsHtml }} 
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Coluna da Direita: Slideshow */}
          <div id="slideshow">
            {companyProfile?.slideshowImages && companyProfile.slideshowImages.length > 0 && (
              <ImageSlideshow images={companyProfile.slideshowImages} />
            )}
          </div>
        </div>





        <div className="mt-8">
          <h2 className="text-2xl font-bold text-indigo-700 mb-4">Próximos Eventos</h2>
        {companyProfile?.events.length === 0 ? (
          <p className="text-gray-600">De momento, não há eventos agendados.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companyProfile?.events.map(event => (
              <div key={event.id} className="border rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
                <h3 className="text-xl font-semibold text-gray-900">{event.name}</h3>
                <p className="text-gray-600 mt-2">{event.location}</p>
                <p className="text-gray-600">{new Date(event.startDate).toLocaleDateString('pt-PT')}</p>
                <Link to={`/events/${event.id}`} className="mt-4 inline-block text-indigo-600 hover:underline font-semibold">
                  Ver Detalhes e Inscrever-se →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
    </>
  );
};

export default PublicCompanyPage;