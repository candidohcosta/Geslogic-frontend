// frontend/src/pages/CompanyHomepageEditPage.tsx (VERSÃO COMPLETA)

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCompanyDetails, updateCompany } from '../services/api';
import { UserRole } from '../types/user';
import { FilePurpose } from '../types/file';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SingleFileUpload } from '../components/ui/SingleFileUpload';
import { MultiFileUpload } from '../components/ui/MultiFileUpload';
import RichTextEditor from '../components/ui/RichTextEditor';
import MultiFileUploadManager from '../components/ui/MultiFileUploadManager';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { Copy, Check } from 'lucide-react';

const CompanyHomepageEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { companyId } = useParams<{ companyId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [aboutUsHtml, setAboutUsHtml] = useState('');

  const { data: companyDetails, isLoading, error } = useQuery({
    queryKey: ['company', companyId],
    queryFn: () => fetchCompanyDetails(companyId!),
    enabled: !!companyId,
  });

  const [isCopied, copy] = useCopyToClipboard();
  const publicUrl = `${window.location.protocol}//${companyDetails?.slug}.${process.env.REACT_APP_MAIN_DOMAIN}:${window.location.port}`;

  useEffect(() => {
    if (companyDetails) {
      setAboutUsHtml(companyDetails.aboutUsHtml || '');
    }
  }, [companyDetails]);

  const { mutate: updateCompanyMutate, isPending } = useMutation({
    mutationFn: updateCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', companyId] });
    },
  });

  const handleSaveAboutUs = () => {
    updateCompanyMutate({ companyId: companyId!, companyData: { aboutUsHtml } });
  };

  //if (!user || user.role !== UserRole.PLATFORM_ADMIN) return <Navigate to="/dashboard" />;
  if (!user) return <Navigate to="/login" />;
  if (
    user.role !== UserRole.PLATFORM_ADMIN &&
    // Permite o acesso se for um CompanyAdmin E o ID da empresa no URL for o mesmo do seu token
    !(user.role === UserRole.COMPANY_ADMIN && user.companyId === companyId)
  ) {
    return <Navigate to="/dashboard" />; // Ou para uma página de "acesso negado"
  }
  if (isLoading) return <div>A carregar...</div>;
  if (error) return <div>Erro: {(error as Error).message}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Editar Homepage da Empresa: {companyDetails?.name}</h1>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => copy(publicUrl)}>
            {isCopied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            {isCopied ? 'Copiado!' : 'Copiar Link Público'}
          </Button>
          <Button onClick={() => navigate(-1)} variant="outline">Voltar</Button>
        </div>
      </div>

      {/* Card para o Logótipo */}
      <Card>
        <CardHeader>
          <CardTitle>Logótipo da Empresa</CardTitle>
          <CardDescription>Esta imagem aparecerá no topo da página pública da empresa.</CardDescription>
        </CardHeader>
        <CardContent>
          <SingleFileUpload
            ownerType="Company"
            ownerId={companyId!}
            purpose={FilePurpose.COMPANY_LOGO}
            currentFileUrl={companyDetails?.logo?.url}
            onUploadSuccess={(newFile) => {
              updateCompanyMutate({ companyId: companyId!, companyData: { logo_file_id: newFile.id } });
            }}
            onFileClear={() => {
              updateCompanyMutate({ companyId: companyId!, companyData: { logo_file_id: null } });
            }}
          />
        </CardContent>
      </Card>

      {/* Card para o Texto "Sobre Nós" */}
      <Card>
        <CardHeader>
          <CardTitle>Texto "Sobre Nós"</CardTitle>
          <CardDescription>Este texto aparecerá na página pública da empresa.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-white rounded-md border">
            <RichTextEditor value={aboutUsHtml} onChange={setAboutUsHtml} />
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button onClick={handleSaveAboutUs} disabled={isPending}>
            {isPending ? 'A Guardar...' : 'Guardar Texto'}
          </Button>
        </CardFooter>
      </Card>
      
      {/* Card para o Slideshow (ainda por implementar) */}
      <Card>
        <CardHeader>
          <CardTitle>Imagens do Slideshow</CardTitle>
            <CardDescription>
              Carregue até 5 imagens. Para melhores resultados, use imagens com formato paisagem (proporção 16:9).
            </CardDescription>
        </CardHeader>
        <CardContent>
          {/* ANTES */}
          {/* <p className="text-muted-foreground ...">O gestor ... aparecerá aqui.</p> */}

          {/* DEPOIS */}
{/*           <MultiFileUpload
            ownerType="Company"
            ownerId={companyId!}
            purpose={FilePurpose.COMPANY_SLIDESHOW}
            // Passamos a lista de imagens que já vêm da nossa query principal
            existingFiles={companyDetails?.slideshowImages || []}
            maxFiles={5}
            // Dizemos ao componente qual a query a invalidar após um upload/delete
            queryKeyToInvalidate={['company', companyId]} */}

    <MultiFileUploadManager
      ownerType="Company"
      ownerId={companyId!}
      purpose={FilePurpose.COMPANY_SLIDESHOW}
      existingFiles={companyDetails?.slideshowImages || []}
      queryKeyToInvalidate={['company', companyId]}
      maxFiles={5} // Adicionamos a prop para o limite

          />
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanyHomepageEditPage;