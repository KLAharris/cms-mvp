import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useEffect, useRef, useState } from 'react';
import { Subject } from 'rxjs';

import { getContent, updateContent } from '../api/content.api';
import type { ContentItem } from '../types/content.types';
import { createAutosaveStream, type AutosaveStatus, type FormSnapshot } from '../streams/autosave.stream';
import { slugify } from '../utils/slugify';
import { useSubmitForReview, usePublishContent, useUnpublishContent } from './useContentMutations';

export type ContentEditorFormValues = {
  title: string;
  slug: string;
  body: unknown;
  tags: string[];
  category: string;
  seo: {
    metaTitle: string;
    metaDescription: string;
  };
};

export function useContentEditor(id: string) {
  const isNew = id === 'new';

  const { data: content, isLoading } = useQuery<ContentItem>({
    queryKey: ['content', id],
    queryFn: () => getContent(id),
    enabled: !isNew,
  });

  const form = useForm<ContentEditorFormValues>({
    defaultValues: {
      title: '',
      slug: '',
      body: null,
      tags: [],
      category: '',
      seo: {
        metaTitle: '',
        metaDescription: '',
      },
    },
  });

  // Populate form when content loads
  useEffect(() => {
    if (content) {
      form.reset({
        title: content.title,
        slug: content.slug,
        body: content.body,
        tags: content.tags,
        category: content.category ?? '',
        seo: {
          metaTitle: content.seo?.metaTitle ?? '',
          metaDescription: content.seo?.metaDescription ?? '',
        },
      });
    }
  }, [content, form]);

  // Auto-generate slug from title (only when new or slug is still matching title)
  const titleValue = form.watch('title');
  const slugValue = form.watch('slug');
  const prevTitle = useRef('');

  useEffect(() => {
    if (prevTitle.current !== titleValue) {
      const generatedSlug = slugify(prevTitle.current);
      if (slugValue === generatedSlug || slugValue === '') {
        form.setValue('slug', slugify(titleValue));
      }
      prevTitle.current = titleValue;
    }
  }, [titleValue, slugValue, form]);

  // Autosave stream
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>({ kind: 'idle' });
  const formChanges$ = useRef(new Subject<FormSnapshot>());

  useEffect(() => {
    const subject = formChanges$.current;
    const subscription = createAutosaveStream(
      subject.asObservable(),
      (snapshot) => updateContent(snapshot.id, {
        title: snapshot.title,
        slug: snapshot.slug,
        body: snapshot.body,
        tags: snapshot.tags,
        category: snapshot.category,
        seoTitle: snapshot.seo?.metaTitle,
        seoDescription: snapshot.seo?.metaDescription,
      }),
    ).subscribe((status) => {
      setAutosaveStatus(status);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Push form changes to autosave stream
  useEffect(() => {
    const subscription = form.watch((values) => {
      if (!isNew && content) {
        formChanges$.current.next({
          id: content.id,
          isDirty: form.formState.isDirty,
          title: values.title ?? '',
          body: values.body,
          slug: values.slug ?? '',
          seo: {
            metaTitle: values.seo?.metaTitle,
            metaDescription: values.seo?.metaDescription,
          },
          tags: values.tags,
          category: values.category,
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [form, isNew, content]);

  const submitForReview = useSubmitForReview(id);
  const publish = usePublishContent(id);
  const unpublish = useUnpublishContent(id);

  return {
    content,
    isLoading,
    form,
    autosaveStatus,
    submitForReview,
    publish,
    unpublish,
  };
}
