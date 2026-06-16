import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/Select';
import { Label } from '../ui/Label';
import { Building2 } from 'lucide-react';

export type CompanyOption = { id: string; name: string };

type BaseProps = {
  companies: CompanyOption[];
  includeAllOption?: boolean;
  allLabel?: string;
  placeholder?: string;
  className?: string;           // wrapper externo
  triggerClassName?: string;    // classes extra para o Trigger
  contentClassName?: string;    // classes extra para o Content
  triggerWidthClass?: string;   // NOVO: controla largura do Trigger (ex.: 'w-[24rem] max-w-[60vw]')
  label?: string;
  labelId?: string;
  disabled?: boolean;
};

type ControlledProps = BaseProps & {
  mode?: 'controlled';
  value: string;
  onChange: (companyId: string) => void;
};

type NavigateProps = BaseProps & {
  mode: 'navigate';
  value: string;
  buildHref: (companyId: string) => string;
};

type CompanySelectProps = ControlledProps | NavigateProps;

export const CompanySelect: React.FC<CompanySelectProps> = (props) => {
  const {
    companies,
    includeAllOption = false,
    allLabel = 'Todas as Empresas',
    placeholder = 'Empresa',
    className,
    triggerClassName,
    contentClassName,
    triggerWidthClass = 'w-[24rem] max-w-[60vw]', // ← largura padrão mais generosa
    label = 'Filtrar por Empresa',
    labelId = 'company-select',
    disabled = false,
  } = props as BaseProps;

  const navigate = useNavigate();

  const handleChange = (newVal: string) => {
    if ('mode' in props && props.mode === 'navigate') {
      navigate(props.buildHref(newVal));
    } else if ('onChange' in props) {
      props.onChange(newVal);
    }
  };

  return (
    <div className={['shrink-0', className || ''].join(' ')}>
      <Label htmlFor={labelId} className="sr-only">{label}</Label>

      <Select
        /* value={('value' in props ? props.value : undefined) as string} */
        
  value={
    'value' in props && props.value !== ''
      ? props.value
      : undefined
  }

        onValueChange={handleChange}
        disabled={disabled}
      >

        <SelectTrigger
        id={labelId}
        className={[
            'shrink-0',
            triggerWidthClass,
            'flex items-center justify-between',
            'px-3 py-2 bg-white border border-gray-300 rounded-md',
            'overflow-hidden', 
            triggerClassName || '',
        ].join(' ')}
        >
        <div className="flex items-center gap-2 overflow-hidden">
            <Building2 className="w-4 h-4 text-gray-500 flex-shrink-0" />

            {/* TRUNCATE FORÇADO */}
            <span className="truncate text-left">
            {(() => {
                if ('value' in props) {
                const val = props.value;
                if (val === 'ALL') return allLabel;
                const match = companies.find((c) => c.id === val);
                return match?.name || placeholder;
                }
                return placeholder;
            })()}
            </span>
        </div>

        {/* caret à direita */}
        </SelectTrigger>

        <SelectContent
          position="popper"
          side="bottom"
          align="start"
          sideOffset={4}
          className={['min-w-[26rem] max-w-[42rem]', contentClassName || ''].join(' ')}
        >
          {includeAllOption && (
            <SelectItem value="ALL" className="whitespace-normal break-words">
              {allLabel}
            </SelectItem>
          )}
          {companies.map((c) => (
            <SelectItem key={c.id} value={c.id} className="whitespace-normal break-words">
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>

      </Select>
    </div>
  );
};