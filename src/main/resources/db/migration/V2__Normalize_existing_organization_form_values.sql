UPDATE company_history_snapshot
SET organization_form = CASE organization_form
    WHEN 'Aksjeselskap' THEN 'AS'
    WHEN 'Allmennaksjeselskap' THEN 'ASA'
    WHEN 'Enkeltpersonforetak' THEN 'ENK'
    WHEN 'Ansvarlig selskap' THEN 'ANS'
    WHEN 'Delt ansvar' THEN 'DA'
    WHEN 'Selskap med delt ansvar' THEN 'DA'
    WHEN 'Selskap med begrenset ansvar' THEN 'BA'
    WHEN 'Selskap med begrenset ansvar (utgått, men finnes historisk)' THEN 'BA'
    WHEN 'Samvirkeforetak' THEN 'SA'
    WHEN 'Norskregistrert utenlandsk foretak' THEN 'NUF'
    WHEN 'Stiftelse' THEN 'STIFT'
    WHEN 'Forening/lag/innretning' THEN 'FLI'
    WHEN 'Interkommunalt selskap' THEN 'IKS'
    WHEN 'Kommunalt foretak' THEN 'KF'
    WHEN 'Organisasjon (generell)' THEN 'ORG'
    WHEN 'Kommune' THEN 'KOMM'
    WHEN 'Fylkeskommune' THEN 'FYLK'
    WHEN 'Statlig virksomhet' THEN 'STAT'
    WHEN 'Statsforetak' THEN 'SF'
    WHEN 'Særlovsselskap' THEN 'SÆR'
    WHEN 'Bank' THEN 'BANK'
    WHEN 'Forsikringsselskap' THEN 'FORS'
    WHEN 'Sparebank' THEN 'SPAR'
    WHEN 'Verdipapirfond' THEN 'VERD'
    WHEN 'Utenlandsk foretak' THEN 'UTLA'
    WHEN 'Filial av utenlandsk foretak' THEN 'FIL'
    WHEN 'Sameie' THEN 'SAME'
    WHEN 'Konkursbo' THEN 'KBO'
    WHEN 'Konkursbo/dødsbo' THEN 'KBO'
    WHEN 'Kirkelig organisasjon' THEN 'KIRK'
    WHEN 'Partirelatert organisasjon' THEN 'PART'
    WHEN 'STI' THEN 'STIFT'
    WHEN 'BO' THEN 'KBO'
    ELSE organization_form
END
WHERE organization_form IN (
    'Aksjeselskap',
    'Allmennaksjeselskap',
    'Enkeltpersonforetak',
    'Ansvarlig selskap',
    'Delt ansvar',
    'Selskap med delt ansvar',
    'Selskap med begrenset ansvar',
    'Selskap med begrenset ansvar (utgått, men finnes historisk)',
    'Samvirkeforetak',
    'Norskregistrert utenlandsk foretak',
    'Stiftelse',
    'Forening/lag/innretning',
    'Interkommunalt selskap',
    'Kommunalt foretak',
    'Organisasjon (generell)',
    'Kommune',
    'Fylkeskommune',
    'Statlig virksomhet',
    'Statsforetak',
    'Særlovsselskap',
    'Bank',
    'Forsikringsselskap',
    'Sparebank',
    'Verdipapirfond',
    'Utenlandsk foretak',
    'Filial av utenlandsk foretak',
    'Sameie',
    'Konkursbo',
    'Konkursbo/dødsbo',
    'Kirkelig organisasjon',
    'Partirelatert organisasjon',
    'STI',
    'BO'
);
