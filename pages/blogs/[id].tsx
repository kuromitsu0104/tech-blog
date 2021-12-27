import moment from 'moment';
import { NextPage, GetStaticPaths, InferGetStaticPropsType, GetStaticProps } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React from 'react';

import Layout from '../../components/templates/Layout';
import { BlogResponse } from '../../types/blog';
import { TagListResponse } from '../../types/tag';
import { client } from '../../utils/api';
import { isDraft } from '../../utils/isDraft';
import { toStringId } from '../../utils/toStringId';

type StaticProps = {
  blog: BlogResponse;
  tagList: TagListResponse;
  draftKey?: string;
};
type PageProps = InferGetStaticPropsType<typeof getStaticProps>;

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    fallback: 'blocking',
    paths: [],
  };
};

export const getStaticProps: GetStaticProps<StaticProps> = async (context) => {
  const { params, previewData } = context;
  if (!params?.id) {
    throw new Error('Error: ID not found');
  }

  const id = toStringId(params.id);
  const draftKey = isDraft(previewData) ? { draftKey: previewData.draftKey } : {};

  try {
    const blogContentPromise = client.get<BlogResponse>({
      endpoint: 'blogs',
      contentId: id,
      queries: {
        fields: 'id,title,body,publishedAt,tags,thumbnail',
        ...draftKey,
      },
    });

    const tagListPromise = client.get<TagListResponse>({
      endpoint: 'tags',
      queries: { fields: 'id,name' },
    });

    const [blog, tagList] = await Promise.all([blogContentPromise, tagListPromise]);

    return {
      props: { blog, ...draftKey, tagList },
      revalidate: 60,
    };
  } catch (e) {
    return { notFound: true };
  }
};

const Page: NextPage<PageProps> = (props) => {
  const { blog, draftKey, tagList } = props;
  console.log(blog);
  const router = useRouter();

  if (router.isFallback) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Layout tagList={tagList}>
        {draftKey && (
          <div>
            現在プレビューモードで閲覧中です。
            <Link href={`/api/exit-preview?id=${blog.id}`}>
              <a>プレビューを解除</a>
            </Link>
          </div>
        )}

        <div className='py-8 md:px-8'>
          <div className='bg-white md:rounded-lg'>
            <div className='p-4 md:p-8'>
              <div className='relative'>
                <p className='absolute top-1/2 left-1/2 z-10 text-3xl font-bold text-white transform -translate-x-1/2 -translate-y-1/2'>
                  {blog.title}
                </p>
                <svg
                  className='absolute right-32 md:right-36 bottom-6 z-10 w-5 h-5'
                  stroke='cyan'
                  strokeWidth='2'
                  fill='none'
                  viewBox='0 0 24 24'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <path d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' />
                </svg>
                <p className='absolute right-5 bottom-5 z-10 text-lg md:text-xl font-bold text-white'>
                  {moment(blog.publishedAt).format('YYYY-MM-DD')}
                </p>
                <Image
                  className='object-cover rounded-lg brightness-[30%]'
                  src={blog.thumbnail.url}
                  width={800}
                  height={450}
                  priority
                  alt='thumbnail'
                />
              </div>
              <div
                className='pt-7 prose'
                dangerouslySetInnerHTML={{
                  __html: `${blog.body}`,
                }}
              />
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default Page;
